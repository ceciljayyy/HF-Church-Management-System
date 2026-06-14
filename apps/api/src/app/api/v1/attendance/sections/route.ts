import { NextRequest } from 'next/server';
import { z } from 'zod';
import { AttendanceSection, getAttendanceSections, saveCustomAttendanceSections, slugify } from '@/lib/attendance';
import { failure, success } from '@/lib/http';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';

const fieldSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  key: z.string().min(1),
  type: z.string().min(1),
  required: z.boolean().default(false),
  defaultValue: z.union([z.string(), z.number(), z.boolean()]).optional(),
  helpText: z.string().optional(),
  countTowardTotal: z.boolean().default(false),
});

const sectionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.string().default('OTHER'),
  icon: z.string().optional(),
  status: z.string().default('ACTIVE'),
  fields: z.array(fieldSchema).min(1),
});

async function getSession(req: NextRequest) {
  const token = getTokenFromRequest(req);
  if (!token) return null;
  return verifySessionToken(token);
}

export async function GET(req: NextRequest) {
  const session = await getSession(req);
  if (!session) return failure('Unauthorized', 401);
  return success({ items: await getAttendanceSections(session.branchId) });
}

export async function POST(req: NextRequest) {
  try {
    const session = await getSession(req);
    if (!session) return failure('Unauthorized', 401);
    const body = sectionSchema.parse(await req.json());
    const sections = await getAttendanceSections(session.branchId);
    const now = new Date().toISOString();
    const slug = slugify(body.name);
    const item: AttendanceSection = {
      id: `${slug}-${Date.now().toString(36)}`,
      name: body.name.trim(),
      slug,
      description: body.description,
      type: body.type.toUpperCase(),
      icon: body.icon,
      status: body.status.toUpperCase(),
      isDefault: false,
      fields: body.fields.map((field) => ({
        ...field,
        id: field.id || slugify(field.label),
        key: slugify(field.key).replaceAll('-', '_'),
      })),
      createdAt: now,
      updatedAt: now,
    };
    const custom = sections.filter((section) => !section.isDefault);
    await saveCustomAttendanceSections(session.branchId, [...custom, item]);
    return success({ item }, 201);
  } catch (error) {
    if (error instanceof z.ZodError) return failure('Validation error', 422, error.flatten());
    return failure(error instanceof Error ? error.message : 'Unable to create attendance section', 500);
  }
}
