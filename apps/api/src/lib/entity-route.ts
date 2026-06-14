import type { NextRequest } from 'next/server';
import { ZodTypeAny } from 'zod';
import { prisma } from './prisma';
import { failure, success } from './http';
import { getTokenFromRequest, verifySessionToken } from './session';
import { auditMetaFromRequest, createAuditLog } from './audit';

type ResourceConfig = {
  model: keyof typeof prisma;
  searchFields?: string[];
  createSchema?: ZodTypeAny;
  updateSchema?: ZodTypeAny;
  archiveField?: string;
  branchScoped?: boolean;
};

function getDelegate(model: keyof typeof prisma) {
  return (prisma as any)[model] as {
    findMany: (args?: any) => Promise<any[]>;
    count: (args?: any) => Promise<number>;
    create: (args: any) => Promise<any>;
    update: (args: any) => Promise<any>;
    delete: (args: any) => Promise<any>;
    findUnique: (args: any) => Promise<any>;
    findFirst: (args: any) => Promise<any>;
  };
}

async function parseJson(req: NextRequest) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export function createEntityRoute(config: ResourceConfig) {
  const delegate = () => getDelegate(config.model);

  return {
    async GET(req: NextRequest) {
      const session = await getSession(req);
      if (!session) return failure('Unauthorized', 401);
      const url = new URL(req.url);
      const page = Number(url.searchParams.get('page') ?? 1);
      const limit = Math.min(Number(url.searchParams.get('limit') ?? 20), 100);
      const search = url.searchParams.get('search')?.trim() ?? '';
      const id = url.searchParams.get('id');
      const branchScoped = config.branchScoped ?? true;

      if (id) {
        const item = branchScoped ? await delegate().findFirst({ where: { id, branchId: session?.branchId } }) : await delegate().findUnique({ where: { id } });
        if (!item) return failure('Record not found', 404);
        return success({ item });
      }

      const where: any = {};
      if (config.archiveField) where[config.archiveField] = null;
      if (branchScoped && session?.branchId) where.branchId = session.branchId;
      if (search && config.searchFields?.length) {
        where.OR = config.searchFields.map((field) => ({ [field]: { contains: search, mode: 'insensitive' } }));
      }

      const [items, total] = await Promise.all([
        delegate().findMany({
          where,
          skip: (page - 1) * limit,
          take: limit,
          orderBy: { createdAt: 'desc' },
        }),
        delegate().count({ where }),
      ]);

      return success({ items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
    },

    async POST(req: NextRequest) {
      const session = await getSession(req);
      if (!session) return failure('Unauthorized', 401);
      const body = await parseJson(req);
      const schema = config.createSchema;
      const parsed = schema ? schema.parse(body) : body;
      const data = config.branchScoped === false || !session?.branchId ? parsed : { ...parsed, branchId: session.branchId };
      const created = await delegate().create({ data });
      if (session.branchId) {
        await createAuditLog({
          branchId: session.branchId,
          userId: session.userId,
          action: 'CREATE',
          entity: String(config.model),
          entityId: created.id,
          module: String(config.model),
          newValue: sanitizeAuditValue(created),
          ...auditMetaFromRequest(req),
        });
      }
      return success({ item: created }, 201);
    },

    async PATCH(req: NextRequest) {
      const session = await getSession(req);
      if (!session) return failure('Unauthorized', 401);
      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      if (!id) return failure('Missing id', 400);
      const body = await parseJson(req);
      const schema = config.updateSchema ?? config.createSchema;
      const parsed = schema ? schema.parse(body) : body;
      const branchScoped = config.branchScoped ?? true;
      if (branchScoped) {
        const existing = await delegate().findFirst({ where: { id, branchId: session?.branchId } });
        if (!existing) return failure('Record not found', 404);
        const updated = await delegate().update({ where: { id: existing.id }, data: parsed });
        await createAuditLog({
          branchId: session.branchId,
          userId: session.userId,
          action: 'UPDATE',
          entity: String(config.model),
          entityId: id,
          module: String(config.model),
          oldValue: sanitizeAuditValue(existing),
          newValue: sanitizeAuditValue(updated),
          ...auditMetaFromRequest(req),
        });
        return success({ item: updated });
      }

      const updated = await delegate().update({ where: { id }, data: parsed });
      if (session.branchId) {
        await createAuditLog({
          branchId: session.branchId,
          userId: session.userId,
          action: 'UPDATE',
          entity: String(config.model),
          entityId: id,
          module: String(config.model),
          newValue: sanitizeAuditValue(updated),
          ...auditMetaFromRequest(req),
        });
      }
      return success({ item: updated });
    },

    async DELETE(req: NextRequest) {
      const session = await getSession(req);
      if (!session) return failure('Unauthorized', 401);
      const url = new URL(req.url);
      const id = url.searchParams.get('id');
      if (!id) return failure('Missing id', 400);
      const branchScoped = config.branchScoped ?? true;

      if (config.archiveField) {
        if (branchScoped) {
          const existing = await delegate().findFirst({ where: { id, branchId: session?.branchId } });
          if (!existing) return failure('Record not found', 404);
          const updated = await delegate().update({ where: { id: existing.id }, data: { [config.archiveField]: new Date() } });
          await createAuditLog({
            branchId: session.branchId,
            userId: session.userId,
            action: 'ARCHIVE',
            entity: String(config.model),
            entityId: id,
            module: String(config.model),
            oldValue: sanitizeAuditValue(existing),
            newValue: sanitizeAuditValue(updated),
            ...auditMetaFromRequest(req),
          });
          return success({ item: updated });
        }
        const updated = await delegate().update({ where: { id }, data: { [config.archiveField]: new Date() } });
        if (session.branchId) {
          await createAuditLog({
            branchId: session.branchId,
            userId: session.userId,
            action: 'ARCHIVE',
            entity: String(config.model),
            entityId: id,
            module: String(config.model),
            newValue: sanitizeAuditValue(updated),
            ...auditMetaFromRequest(req),
          });
        }
        return success({ item: updated });
      }

      if (branchScoped) {
        const existing = await delegate().findFirst({ where: { id, branchId: session?.branchId } });
        if (!existing) return failure('Record not found', 404);
        await delegate().delete({ where: { id: existing.id } });
        await createAuditLog({
          branchId: session.branchId,
          userId: session.userId,
          action: 'DELETE',
          entity: String(config.model),
          entityId: id,
          module: String(config.model),
          oldValue: sanitizeAuditValue(existing),
          ...auditMetaFromRequest(req),
        });
        return success({ deleted: true });
      }

      await delegate().delete({ where: { id } });
      if (session.branchId) {
        await createAuditLog({
          branchId: session.branchId,
          userId: session.userId,
          action: 'DELETE',
          entity: String(config.model),
          entityId: id,
          module: String(config.model),
          ...auditMetaFromRequest(req),
        });
      }
      return success({ deleted: true });
    },
  };
}

async function getSession(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  try {
    return await verifySessionToken(token);
  } catch {
    return null;
  }
}

export function entityWhereByBranch(branchId?: string | null) {
  return branchId ? { branchId } : {};
}

function sanitizeAuditValue(value: any) {
  if (!value || typeof value !== 'object') return value;
  const clone = { ...value };
  delete clone.password;
  delete clone.passwordHash;
  delete clone.currentPassword;
  delete clone.newPassword;
  delete clone.confirmPassword;
  return clone;
}
