import { NextRequest } from 'next/server';
import { failure, success } from '@/lib/http';
import { getBirthdayCelebrants, groupCelebrantsByMonth } from '@/lib/birthdays';
import { canReadPeople, getAuthedSession, requireBranchId } from '@/lib/people';

function numberParam(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function GET(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!canReadPeople(session.permissions)) return failure('Forbidden', 403);

  try {
    const branchId = await requireBranchId(session.branchId);
    const month = numberParam(req.nextUrl.searchParams.get('month'));
    const week = req.nextUrl.searchParams.get('week') as 'thisWeek' | 'nextWeek' | 'month' | null;
    const currentMonth = new Date().getUTCMonth() + 1;
    const filter = week === 'thisWeek' ? 'thisWeek' : week === 'month' ? 'thisMonth' : 'all';

    const celebrants = await getBirthdayCelebrants(branchId, {
      month: month && month >= 1 && month <= 12 ? month : week === 'month' ? currentMonth : undefined,
      filter,
      classification: req.nextUrl.searchParams.get('classification') || undefined,
      gender: req.nextUrl.searchParams.get('gender') || undefined,
      search: req.nextUrl.searchParams.get('search') || undefined,
    });

    return success({ data: groupCelebrantsByMonth(celebrants, false) });
  } catch (error) {
    return failure('Unable to load birthday celebrants', 500, error);
  }
}
