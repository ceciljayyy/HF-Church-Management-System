import { NextRequest } from 'next/server';
import { failure, success } from '@/lib/http';
import { getBirthdayCelebrants, groupCelebrantsByMonth } from '@/lib/birthdays';
import { canReadPeople, getAuthedSession, requireBranchId } from '@/lib/people';
import { hasPermission } from '@/lib/rbac';

function numberParam(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!canReadPeople(session.permissions) && !hasPermission(session.permissions, 'people.viewBirthdays')) {
    return failure('Forbidden', 403);
  }

  try {
    const branchId = await requireBranchId(session.branchId);
    const filterParam = req.nextUrl.searchParams.get('filter') ?? req.nextUrl.searchParams.get('scope') ?? 'thisMonth';
    const filter = ['today', 'thisWeek', 'thisMonth', 'all'].includes(filterParam) ? (filterParam as any) : 'thisMonth';
    const month = numberParam(req.nextUrl.searchParams.get('month'));
    const limit = numberParam(req.nextUrl.searchParams.get('limit'));
    const grouped = req.nextUrl.searchParams.get('grouped') === 'true';
    const celebrants = await getBirthdayCelebrants(branchId, {
      filter,
      month: month && month >= 1 && month <= 12 ? month : undefined,
      limit,
      search: req.nextUrl.searchParams.get('search') || undefined,
      departmentId: req.nextUrl.searchParams.get('departmentId') || undefined,
      channel: (req.nextUrl.searchParams.get('channel') as any) || undefined,
    });

    if (grouped) {
      const months = groupCelebrantsByMonth(celebrants, true);
      return success({ months, data: months });
    }

    return success({
      data: celebrants,
    });
  } catch (error) {
    return failure('Unable to load birthdays', 500, error);
  }
}
