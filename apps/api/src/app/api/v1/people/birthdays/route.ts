import { NextRequest } from 'next/server';
import { failure, success } from '@/lib/http';
import { getBirthdayCelebrants } from '@/lib/birthdays';
import { canReadPeople, getAuthedSession, requireBranchId } from '@/lib/people';

export async function GET(req: NextRequest) {
  const session = await getAuthedSession(req);
  if (!session) return failure('Unauthorized', 401);
  if (!canReadPeople(session.permissions)) return failure('Forbidden', 403);

  try {
    const branchId = await requireBranchId(session.branchId);
    const scope = req.nextUrl.searchParams.get('scope') ?? 'thisMonth';
    const limit = Number(req.nextUrl.searchParams.get('limit') ?? '0');
    const currentMonth = new Date().getUTCMonth() + 1;
    const celebrants = await getBirthdayCelebrants(branchId, {
      month: scope === 'thisMonth' ? currentMonth : undefined,
    });

    return success({
      data: limit > 0 ? celebrants.slice(0, limit) : celebrants,
    });
  } catch (error) {
    return failure('Unable to load birthdays', 500, error);
  }
}
