import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { failure, success } from '@/lib/http';
import { getTokenFromRequest, verifySessionToken } from '@/lib/session';
import { toNumber } from '@/lib/finance';

const INITIAL_PAYMENT_AMOUNT = 10;
const MONTHLY_PAYMENT_AMOUNT = 5;

function monthStart(year: number, month: number) {
  return new Date(year, month - 1, 1);
}

function nextMonthStart(year: number, month: number) {
  return new Date(year, month, 1);
}

function memberName(member: any) {
  return `${member.person?.firstName ?? ''} ${member.person?.lastName ?? ''}`.trim() || member.person?.preferredName || 'Unknown member';
}

function statusFor(balance: number, paid: number, hasInitial: boolean) {
  if (!hasInitial) return 'INITIAL_DUE';
  if (balance <= 0) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'UNPAID';
}

export async function GET(req: NextRequest) {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return failure('Unauthorized', 401);
    const session = await verifySessionToken(token);
    const url = new URL(req.url);
    const now = new Date();
    const month = Number(url.searchParams.get('month') ?? now.getMonth() + 1);
    const year = Number(url.searchParams.get('year') ?? now.getFullYear());
    const start = monthStart(year, month);
    const end = nextMonthStart(year, month);

    const [members, payments] = await Promise.all([
      prisma.member.findMany({
        where: { branchId: session.branchId, status: 'ACTIVE', deletedAt: null },
        include: { person: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.contribution.findMany({
        where: { branchId: session.branchId, type: 'WELFARE', deletedAt: null },
        include: { person: true, receivedBy: true },
        orderBy: { contributionDate: 'desc' },
      }),
    ]);

    const rows = members.map((member) => {
      const memberPayments = payments.filter((payment) => payment.personId === member.personId || payment.contributorName === memberName(member));
      const currentPayments = memberPayments.filter((payment) => payment.contributionDate >= start && payment.contributionDate < end);
      const initialPayments = memberPayments.filter((payment) => payment.notes?.includes('INITIAL_PAYMENT') || toNumber(payment.amount) >= INITIAL_PAYMENT_AMOUNT);
      const hasInitial = initialPayments.length > 0;
      const currentPaid = currentPayments.reduce((total, payment) => total + toNumber(payment.amount), 0);
      const amountDue = hasInitial ? MONTHLY_PAYMENT_AMOUNT : INITIAL_PAYMENT_AMOUNT;
      const balance = Math.max(amountDue - currentPaid, 0);
      const monthsSinceJoined = Math.max(0, (year - member.createdAt.getFullYear()) * 12 + (month - member.createdAt.getMonth() - 1));
      const arrears = Math.max(0, monthsSinceJoined * MONTHLY_PAYMENT_AMOUNT - memberPayments.reduce((total, payment) => total + toNumber(payment.amount), 0));
      const status = arrears > 0 && hasInitial ? 'ARREARS' : statusFor(balance, currentPaid, hasInitial);

      return {
        id: member.personId,
        memberId: member.membershipNumber,
        membershipNumber: member.membershipNumber,
        memberName: memberName(member),
        phone: member.person?.mobilePhone ?? member.person?.phone ?? member.person?.homePhone,
        initialPaymentStatus: hasInitial ? 'PAID' : 'INITIAL_DUE',
        currentMonthStatus: statusFor(balance, currentPaid, hasInitial),
        amountDue,
        amountPaid: currentPaid,
        balance,
        arrears,
        lastPaymentDate: memberPayments[0]?.contributionDate ?? null,
        status,
      };
    });

    const currentMonthPayments = payments.filter((payment) => payment.contributionDate >= start && payment.contributionDate < end);
    const totalWelfareCollectedThisMonth = currentMonthPayments.reduce((total, payment) => total + toNumber(payment.amount), 0);
    const initialPaymentsCollected = payments.filter((payment) => payment.notes?.includes('INITIAL_PAYMENT')).reduce((total, payment) => total + toNumber(payment.amount), 0);
    const monthlyPaymentsCollected = payments.filter((payment) => payment.notes?.includes('MONTHLY_PAYMENT')).reduce((total, payment) => total + toNumber(payment.amount), 0);

    return success({
      setting: { initialPaymentAmount: INITIAL_PAYMENT_AMOUNT, monthlyPaymentAmount: MONTHLY_PAYMENT_AMOUNT, currency: 'GHS', effectiveDate: start },
      summary: {
        totalWelfareCollectedThisMonth,
        expectedWelfareThisMonth: members.length * MONTHLY_PAYMENT_AMOUNT,
        membersPaidThisMonth: rows.filter((row) => row.currentMonthStatus === 'PAID').length,
        membersUnpaidThisMonth: rows.filter((row) => row.currentMonthStatus === 'UNPAID' || row.currentMonthStatus === 'INITIAL_DUE').length,
        membersInArrears: rows.filter((row) => row.status === 'ARREARS').length,
        welfareArrears: rows.reduce((total, row) => total + row.arrears + row.balance, 0),
        initialPaymentsCollected,
        monthlyPaymentsCollected,
      },
      members: rows,
      payments: payments.map((payment) => ({
        id: payment.id,
        memberId: payment.personId,
        memberName: payment.contributorName,
        paymentType: payment.notes?.match(/paymentType=([A-Z_]+)/)?.[1] ?? 'MONTHLY_PAYMENT',
        month: payment.contributionDate.getMonth() + 1,
        year: payment.contributionDate.getFullYear(),
        amount: toNumber(payment.amount),
        currency: payment.currency,
        paymentMethod: payment.paymentMethod,
        paymentReference: payment.paymentReference,
        paymentDate: payment.contributionDate,
        receivedByName: payment.receivedByName ?? payment.receivedBy?.name,
        note: payment.notes,
      })),
    });
  } catch {
    return failure('Unable to load welfare data', 500);
  }
}
