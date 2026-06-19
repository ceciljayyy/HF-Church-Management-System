import { cacheKeys } from './cache-keys';
import { incrementCacheVersion } from './cache';

export async function invalidateDashboardCache(branchId?: string | null) {
  await incrementCacheVersion(cacheKeys.dashboardVersion(branchId));
}

export async function invalidatePeopleCache(branchId: string) {
  await Promise.all([
    incrementCacheVersion(cacheKeys.peopleVersion(branchId)),
    invalidateDashboardCache(branchId),
    invalidateReportsCache(branchId),
  ]);
}

export async function invalidateDepartmentCache(branchId: string) {
  await Promise.all([
    incrementCacheVersion(cacheKeys.departmentsVersion(branchId)),
    invalidateDashboardCache(branchId),
  ]);
}

export async function invalidateAttendanceCache(branchId: string) {
  await Promise.all([
    incrementCacheVersion(cacheKeys.attendanceVersion(branchId)),
    invalidateDashboardCache(branchId),
    invalidateReportsCache(branchId),
  ]);
}

export async function invalidateReportsCache(branchId?: string | null) {
  const keys = [incrementCacheVersion(cacheKeys.reportsVersion(null))];
  if (branchId) keys.push(incrementCacheVersion(cacheKeys.reportsVersion(branchId)));
  await Promise.all([...keys, invalidateDashboardCache(branchId)]);
}
