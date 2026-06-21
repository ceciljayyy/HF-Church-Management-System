const requiredApiEnv = [
  'DATABASE_URL',
  'DIRECT_URL',
  'AUTH_SECRET',
  'NEXT_PUBLIC_WEB_URL',
  'API_URL',
] as const;

let validated = false;

function assertUrl(name: string, value: string) {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be a valid URL`);
  }
}

export function validateApiEnv() {
  if (validated) return;

  const missing = requiredApiEnv.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required API environment variables: ${missing.join(', ')}`);
  }

  const databaseUrl = assertUrl('DATABASE_URL', process.env.DATABASE_URL!);
  const directUrl = assertUrl('DIRECT_URL', process.env.DIRECT_URL!);

  if (databaseUrl.hostname.endsWith('.pooler.supabase.com') && databaseUrl.port === '6543') {
    if (databaseUrl.searchParams.get('pgbouncer') !== 'true') {
      throw new Error('DATABASE_URL must include pgbouncer=true when using the Supabase transaction pooler');
    }
    if (Number(databaseUrl.searchParams.get('connection_limit')) < 5) {
      throw new Error('DATABASE_URL must include connection_limit=5 or higher when using the Supabase transaction pooler');
    }
    if (Number(databaseUrl.searchParams.get('pool_timeout')) < 60) {
      throw new Error('DATABASE_URL must include pool_timeout=60 or higher when using the Supabase transaction pooler');
    }
  }

  if (directUrl.hostname.endsWith('.pooler.supabase.com')) {
    throw new Error('DIRECT_URL must use the direct Supabase database host, not a Supabase pooler host');
  }

  validated = true;
}
