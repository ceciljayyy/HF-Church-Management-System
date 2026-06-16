import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) return failure('Unauthorized', 401);

  const churchProfile = await (prisma as any).churchProfile.findUnique({
    where: { branchId: session.branchId },
  });

  return success({
    onboardingCompleted: Boolean(churchProfile?.onboardingCompleted),
    churchProfileExists: Boolean(churchProfile),
    churchProfile,
  });
}
