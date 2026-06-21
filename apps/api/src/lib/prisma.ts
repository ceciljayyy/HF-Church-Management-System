import { PrismaClient } from '@prisma/client';
import { validateApiEnv } from './env';

function setMinimumSearchParam(url: URL, key: string, minimum: number) {
  const current = Number(url.searchParams.get(key));
  if (!Number.isFinite(current) || current < minimum) {
    url.searchParams.set(key, String(minimum));
  }
}

function normalizeDatabaseUrl() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return;

  try {
    const url = new URL(databaseUrl);
    const isSupabasePooler = url.hostname.endsWith('.pooler.supabase.com');

    if (!isSupabasePooler) return;

    if (url.port === '6543') {
      url.searchParams.set('pgbouncer', 'true');
    }

    setMinimumSearchParam(url, 'connection_limit', 5);

    if (!url.searchParams.has('connect_timeout')) {
      url.searchParams.set('connect_timeout', '30');
    }

    setMinimumSearchParam(url, 'pool_timeout', 60);

    if (!url.searchParams.has('sslmode')) {
      url.searchParams.set('sslmode', 'require');
    }

    process.env.DATABASE_URL = url.toString();
  } catch {
    // Prisma will report malformed connection strings with the original error.
  }
}

export async function withPrismaConnectionRetry<T>(operation: () => Promise<T>, attempts = 2): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
      const isConnectionError = code === 'P1001' || code === 'P1002' || code === 'P2024';

      if (!isConnectionError || attempt === attempts) break;

      await new Promise((resolve) => setTimeout(resolve, 750 * attempt));
    }
  }

  throw lastError;
}

normalizeDatabaseUrl();
validateApiEnv();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ log: ['error', 'warn'] });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;
