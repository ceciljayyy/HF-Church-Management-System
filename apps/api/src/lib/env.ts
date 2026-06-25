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

function isSupabasePooler(url: URL) {
  return url.hostname.endsWith('.pooler.supabase.com');
}

function isSupabaseDirect(url: URL) {
  return url.hostname.startsWith('db.') && url.hostname.endsWith('.supabase.co');
}

export function validateApiEnv() {
  if (validated) return;

  const missing = requiredApiEnv.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    throw new Error(`Missing required API environment variables: ${missing.join(', ')}`);
  }

  const databaseUrl = assertUrl('DATABASE_URL', process.env.DATABASE_URL!);
  const directUrl = assertUrl('DIRECT_URL', process.env.DIRECT_URL!);

  const databaseUsesPooler = isSupabasePooler(databaseUrl);
  const directUsesPooler = isSupabasePooler(directUrl);
  const directUsesDirectHost = isSupabaseDirect(directUrl);

  // DATABASE_URL can use Supabase transaction pooler.
  if (databaseUsesPooler && databaseUrl.port === '6543') {
    if (databaseUrl.searchParams.get('pgbouncer') !== 'true') {
      throw new Error(
        'DATABASE_URL must include pgbouncer=true when using the Supabase transaction pooler'
      );
    }

    const connectionLimit = databaseUrl.searchParams.get('connection_limit');
    const poolTimeout = databaseUrl.searchParams.get('pool_timeout');

    // These are optional. Only validate them if you added them.
    if (connectionLimit && Number(connectionLimit) < 5) {
      throw new Error('DATABASE_URL connection_limit must be 5 or higher when provided');
    }

    if (poolTimeout && Number(poolTimeout) < 60) {
      throw new Error('DATABASE_URL pool_timeout must be 60 or higher when provided');
    }
  }

  // DIRECT_URL can use either:
  // 1. Supabase direct host: db.<project-ref>.supabase.co
  // 2. Supabase session pooler: *.pooler.supabase.com on port 5432
  if (!directUsesPooler && !directUsesDirectHost) {
    throw new Error(
      'DIRECT_URL must use a valid Supabase direct host or Supabase session pooler host'
    );
  }

  if (directUsesPooler && directUrl.port !== '5432') {
    throw new Error('DIRECT_URL must use Supabase session pooler port 5432');
  }

  validated = true;
}