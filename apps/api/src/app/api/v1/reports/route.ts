import { prisma } from '@/lib/prisma';
import { success } from '@/lib/http';
import { getCacheVersion, getOrSetCache } from '@/lib/cache';
import { cacheKeys } from '@/lib/cache-keys';

export async function GET() {
  const version = await getCacheVersion(cacheKeys.reportsVersion(null));
  const payload = await getOrSetCache(
    cacheKeys.reports(null, version, 'summary', {}),
    900,
    async () => {
      const [members, attendanceRecords, contributions, expenses] = await Promise.all([
        prisma.member.count({ where: { deletedAt: null } }),
        prisma.attendanceRecord.count(),
        prisma.contribution.aggregate({ _sum: { amount: true }, where: { deletedAt: null } }),
        prisma.expense.aggregate({ _sum: { amount: true }, where: { deletedAt: null } }),
      ]);

      const giving = Number(contributions._sum.amount ?? 0);
      const expenseTotal = Number(expenses._sum.amount ?? 0);

      return {
        items: [
          { id: 'membership', title: 'Membership Summary', reportType: 'MEMBERSHIP', data: { members } },
          { id: 'attendance', title: 'Attendance Summary', reportType: 'ATTENDANCE', data: { attendanceRecords } },
          { id: 'finance', title: 'Finance Summary', reportType: 'FINANCE', data: { giving, expenses: expenseTotal, netBalance: giving - expenseTotal } },
        ],
      };
    },
  );

  return success(payload);
}
