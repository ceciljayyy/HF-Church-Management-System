import { redis } from './redis';

function logCacheError(operation: string, error: unknown) {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[cache] ${operation} failed`, error);
  }
}

export async function getCache<T>(key: string): Promise<T | null> {
  if (!redis) return null;

  try {
    return await redis.get<T>(key);
  } catch (error) {
    logCacheError(`get ${key}`, error);
    return null;
  }
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds: number,
) {
  if (!redis) return;

  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch (error) {
    logCacheError(`set ${key}`, error);
  }
}

export async function deleteCache(key: string) {
  if (!redis) return;

  try {
    await redis.del(key);
  } catch (error) {
    logCacheError(`delete ${key}`, error);
  }
}

export async function deleteCacheMany(keys: string[]) {
  if (!redis || keys.length === 0) return;

  try {
    await redis.del(...keys);
  } catch (error) {
    logCacheError(`delete many`, error);
  }
}

export async function getOrSetCache<T>(
  key: string,
  ttlSeconds: number,
  fetchFreshData: () => Promise<T>,
): Promise<T> {
  const cached = await getCache<T>(key);
  if (cached !== null) return cached;

  const fresh = await fetchFreshData();
  await setCache(key, fresh, ttlSeconds);
  return fresh;
}

export async function getCacheVersion(key: string) {
  return (await getCache<number>(key)) ?? 1;
}

export async function incrementCacheVersion(key: string) {
  if (!redis) return;

  try {
    await redis.incr(key);
  } catch (error) {
    logCacheError(`increment ${key}`, error);
  }
}
