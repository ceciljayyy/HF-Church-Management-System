import { NextRequest } from 'next/server';
import { prisma, withPrismaConnectionRetry } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getRequestSession } from '@/lib/request-session';

export async function GET(req: NextRequest) {
  const session = await getRequestSession(req);
  if (!session) return failure('Unauthorized', 401);

  try {
    const churchProfile: any = await withPrismaConnectionRetry(() =>
      (prisma as any).churchProfile.findUnique({
        where: { branchId: session.branchId },
      }),
    );

    return success({
      onboardingCompleted: Boolean(churchProfile?.onboardingCompleted),
      churchProfileExists: Boolean(churchProfile),
      churchProfile,
    });
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    if (code === 'P1001' || code === 'P1002') {
      return failure('Database connection unavailable', 503);
    }

    throw error;
  }
}
