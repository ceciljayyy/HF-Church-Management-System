'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CircleDollarSign, FileBarChart2, HandCoins, Plus, TrendingDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { FormField } from '@/components/ui/form-field';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { PeopleSelector } from '@/components/people/people-selector';
import { StatCard } from '@/components/ui/stat-card';
import { financeService } from '@/lib/services/finance.service';
import { formatCurrency } from '@/lib/utils';

type FinanceMode = 'overview' | 'welfare' | 'expenses' | 'funds' | 'history';
type ModalName = 'welfare' | 'expense' | 'fund-type' | 'fund-campaign' | 'fund-payment' | null;

const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none transition placeholder:text-muted focus:border-lime';
const buttonClass = 'inline-flex items-center gap-2 rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen transition hover:bg-lime/90 disabled:opacity-60';
const secondaryButtonClass = 'rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary';
const dangerButtonClass = 'rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/20';

const paymentMethods = ['CASH', 'MOBILE_MONEY', 'BANK_TRANSFER', 'CARD', 'CHEQUE', 'OTHER'];
const paymentTypes = ['INITIAL_PAYMENT', 'MONTHLY_PAYMENT', 'ARREARS_PAYMENT', 'ADVANCE_PAYMENT'];
const expenseCategories = ['Utilities', 'Rent', 'Equipment', 'Media', 'Welfare', 'Missions', 'Transport', 'Maintenance', 'Salaries', 'Honorarium', 'Outreach', 'Event Cost', 'Office Supplies', 'Other'];
const fundStatuses = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'ARCHIVED'];

const today = () => new Date().toISOString().slice(0, 10);
const currentMonth = () => String(new Date().getMonth() + 1);
const currentYear = () => String(new Date().getFullYear());

function label(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (match) => match.toUpperCase());
}

function money(value: unknown, currency = 'GHS') {
  return formatCurrency(Number(value ?? 0), currency);
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toUpperCase();
  const className = normalized.includes('UNPAID') || normalized.includes('ARREARS') || normalized.includes('PENDING') || normalized.includes('OVERDUE')
    ? 'border-warning/40 bg-warning/10 text-warning'
    : normalized.includes('REJECTED') || normalized.includes('CANCELLED')
      ? 'border-danger/40 bg-danger/10 text-danger'
      : normalized.includes('PARTIAL') || normalized.includes('INITIAL')
        ? 'border-info/40 bg-info/10 text-info'
        : 'border-green/40 bg-green/10 text-green';
  return <Badge className={className}>{label(status)}</Badge>;
}

function ChartCard({ title, data, valueKey = 'value' }: { title: string; data: any[]; valueKey?: string }) {
  const max = Math.max(1, ...data.map((item) => Math.abs(Number(item[valueKey] ?? 0))));
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <div className="mt-4 space-y-3">
        {data.slice(0, 8).map((item) => (
          <div key={item.name} className="grid grid-cols-[7rem_minmax(0,1fr)_5rem] items-center gap-3 text-sm">
            <span className="truncate text-secondary">{item.name}</span>
            <div className="h-2 rounded-full bg-surface">
              <div className="h-2 rounded-full bg-lime" style={{ width: `${(Math.abs(Number(item[valueKey] ?? 0)) / max) * 100}%` }} />
            </div>
            <span className="text-right text-xs text-muted">{money(item[valueKey])}</span>
          </div>
        ))}
        {!data.length ? <p className="text-sm text-secondary">No chart data yet.</p> : null}
      </div>
    </div>
  );
}

export function FinancePage({ mode }: { mode: FinanceMode }) {
  const router = useRouter();
  const [overview, setOverview] = useState<any>(null);
  const [welfare, setWelfare] = useState<any>({ summary: {}, members: [], payments: [] });
  const [expenses, setExpenses] = useState<any[]>([]);
  const [fundTypes, setFundTypes] = useState<any[]>([]);
  const [funds, setFunds] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [modal, setModal] = useState<ModalName>(null);
  const [selectedFundType, setSelectedFundType] = useState<any>(null);
  const [selectedFund, setSelectedFund] = useState<any>(null);
  const [memberDetail, setMemberDetail] = useState<any>(null);

  async function loadFinance() {
    setError('');
    try {
      const [overviewData, welfareData, expenseData, fundTypeData, fundData, historyData] = await Promise.all([
        financeService.getFinanceOverview(),
        financeService.getWelfareSummary(),
        financeService.getExpenses(),
        financeService.getFundTypes(),
        financeService.getFunds(),
        financeService.getFinanceHistory(),
      ]);
      setOverview(overviewData);
      setWelfare(welfareData);
      setExpenses(expenseData.items ?? []);
      setFundTypes(fundTypeData.items ?? []);
      setFunds(fundData.items ?? []);
      setHistory(historyData.items ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load finance data.');
    } finally {
      setLoading(false);
    }
  }

  async function afterMutation(messageText: string) {
    setMessage(messageText);
    setModal(null);
    setSelectedFund(null);
    setSelectedFundType(null);
    await loadFinance();
    router.refresh();
  }

  useEffect(() => {
    loadFinance();
  }, []);

  useEffect(() => {
    if (mode !== 'overview') return;
    const timer = window.setInterval(loadFinance, 8000);
    return () => window.clearInterval(timer);
  }, [mode]);

  const page = {
    overview: {
      title: 'Finance',
      subtitle: 'Welfare, expenses, fund campaigns, and finance history for the church.',
      actions: <Link href="/finance/history" className={secondaryButtonClass}>View History</Link>,
    },
    welfare: {
      title: 'Welfare',
      subtitle: 'Track monthly member welfare contributions, initial payments, arrears, and payment history.',
      actions: <button type="button" onClick={() => setModal('welfare')} className={buttonClass}><Plus className="h-4 w-4" />Record Welfare Payment</button>,
    },
    expenses: {
      title: 'Expenses',
      subtitle: 'Manage expense requests, approvals, paid status, vendors, categories, and fund impact.',
      actions: <button type="button" onClick={() => setModal('expense')} className={buttonClass}><Plus className="h-4 w-4" />Add Expense</button>,
    },
    funds: {
      title: 'Funds',
      subtitle: 'Manage short-term fund campaigns, fund types, progress, and pledge-style giving.',
      actions: <button type="button" onClick={() => setModal('fund-campaign')} className={buttonClass}><Plus className="h-4 w-4" />Create Fund</button>,
    },
    history: {
      title: 'Finance History',
      subtitle: 'Welfare payments, expenses, fund campaigns, fund payments, pledge funds, and receipts.',
      actions: null,
    },
  }[mode];

  if (loading) {
    return <div className="rounded-lg border border-border bg-card p-6 text-sm text-secondary">Loading finance data...</div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={page.title} subtitle={page.subtitle} actions={page.actions} />
      {error ? <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      {message ? <div className="rounded-lg border border-green/40 bg-green/10 px-4 py-3 text-sm text-green">{message}</div> : null}

      {mode === 'overview' ? <Overview overview={overview} welfare={welfare} funds={funds} history={history} /> : null}
      {mode === 'welfare' ? <WelfareView welfare={welfare} onMember={setMemberDetail} /> : null}
      {mode === 'expenses' ? <ExpensesView expenses={expenses} overview={overview} onUpdated={afterMutation} /> : null}
      {mode === 'funds' ? <FundsView funds={funds} overview={overview} fundTypes={fundTypes} onCreateType={() => setModal('fund-type')} onCreateFund={(type) => { setSelectedFundType(type); setModal('fund-campaign'); }} onRecordPayment={(fund) => { setSelectedFund(fund); setModal('fund-payment'); }} /> : null}
      {mode === 'history' ? <HistoryTable history={history} /> : null}

      <RecordWelfarePaymentModal open={modal === 'welfare'} members={welfare.members ?? []} onClose={() => setModal(null)} onSaved={() => afterMutation('Welfare payment recorded successfully.')} />
      <AddExpenseModal open={modal === 'expense'} onClose={() => setModal(null)} funds={funds} onSaved={() => afterMutation('Expense saved successfully.')} />
      <CreateFundTypeModal open={modal === 'fund-type'} onClose={() => setModal(null)} onSaved={(item) => { setFundTypes((current) => [...current, item]); afterMutation('Fund type created successfully.'); }} />
      <CreateFundCampaignModal open={modal === 'fund-campaign'} onClose={() => { setModal(null); setSelectedFundType(null); }} fundTypes={fundTypes} selectedType={selectedFundType} onChooseType={setSelectedFundType} onCreateType={() => setModal('fund-type')} onSaved={() => afterMutation('Fund created successfully.')} />
      <RecordFundPaymentModal fund={selectedFund} onClose={() => setSelectedFund(null)} onSaved={() => afterMutation('Fund payment recorded successfully.')} />
      <MemberDetailModal member={memberDetail} payments={welfare.payments ?? []} onClose={() => setMemberDetail(null)} />
    </div>
  );
}

function Overview({ overview, welfare, funds, history }: { overview: any; welfare: any; funds: any[]; history: any[] }) {
  const activeFunds = funds.filter((fund) => (fund.status ?? 'ACTIVE') === 'ACTIVE');
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Welfare Collected This Month" value={money(overview?.totalWelfareCollectedThisMonth ?? welfare?.summary?.totalWelfareCollectedThisMonth)} icon={<HandCoins className="h-5 w-5" />} accent="green" />
        <StatCard label="Welfare Arrears" value={money(overview?.welfareArrears ?? welfare?.summary?.welfareArrears)} icon={<HandCoins className="h-5 w-5" />} accent="warning" />
        <StatCard label="Total Expenses This Month" value={money(overview?.totalExpensesThisMonth)} icon={<TrendingDown className="h-5 w-5" />} accent="danger" />
        <StatCard label="Net Balance" value={money(overview?.netBalance)} icon={<CircleDollarSign className="h-5 w-5" />} accent="warning" />
        <StatCard label="Active Funds" value={overview?.activeFunds ?? activeFunds.length} icon={<FileBarChart2 className="h-5 w-5" />} accent="lime" />
        <StatCard label="Total Fund Contributions" value={money(overview?.totalFundContributions)} icon={<HandCoins className="h-5 w-5" />} accent="info" />
        <StatCard label="Pending Expense Approvals" value={overview?.pendingExpenseApprovals ?? 0} icon={<FileBarChart2 className="h-5 w-5" />} accent="warning" />
        <StatCard label="Available Balance" value={money(overview?.availableBalance ?? overview?.fundsAvailable)} icon={<CircleDollarSign className="h-5 w-5" />} accent="green" />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <ChartCard title="Welfare Monthly Collection Trend" data={overview?.welfareMonthlyTrend ?? []} />
        <ChartCard title="Expenses Trend" data={overview?.expensesTrend ?? []} />
        <ChartCard title="Fund Contributions by Fund Type" data={overview?.fundContributionsByFundType ?? []} />
        <ChartCard title="Income vs Expenses" data={(overview?.incomeVsExpenses ?? []).map((item: any) => ({ name: item.name, value: Number(item.giving ?? 0) - Number(item.expenses ?? 0) }))} />
        <ChartCard title="Welfare Paid vs Unpaid Members" data={overview?.welfarePaidVsUnpaid ?? []} />
      </section>

      <Panel title="Recent Finance Activity">
        <HistoryTable history={history.slice(0, 8)} compact />
      </Panel>
    </div>
  );
}

function WelfareView({ welfare, onMember }: { welfare: any; onMember: (member: any) => void }) {
  const summary = welfare.summary ?? {};
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Welfare Collected This Month" value={money(summary.totalWelfareCollectedThisMonth)} icon={<HandCoins className="h-5 w-5" />} accent="green" />
        <StatCard label="Expected Welfare This Month" value={money(summary.expectedWelfareThisMonth)} icon={<HandCoins className="h-5 w-5" />} accent="lime" />
        <StatCard label="Members Paid This Month" value={summary.membersPaidThisMonth ?? 0} icon={<HandCoins className="h-5 w-5" />} accent="green" />
        <StatCard label="Members Unpaid This Month" value={summary.membersUnpaidThisMonth ?? 0} icon={<HandCoins className="h-5 w-5" />} accent="warning" />
        <StatCard label="Members In Arrears" value={summary.membersInArrears ?? 0} icon={<FileBarChart2 className="h-5 w-5" />} accent="danger" />
        <StatCard label="Initial Payments Collected" value={money(summary.initialPaymentsCollected)} icon={<HandCoins className="h-5 w-5" />} accent="info" />
        <StatCard label="Monthly Payments Collected" value={money(summary.monthlyPaymentsCollected)} icon={<HandCoins className="h-5 w-5" />} accent="lime" />
      </section>
      <WelfareTable members={welfare.members ?? []} onMember={onMember} />
    </div>
  );
}

function ExpensesView({ expenses, overview, onUpdated }: { expenses: any[]; overview: any; onUpdated: (message: string) => void }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Expenses This Month" value={money(overview?.totalExpensesThisMonth)} icon={<TrendingDown className="h-5 w-5" />} accent="danger" />
        <StatCard label="Pending Approval" value={expenses.filter((item) => item.status === 'PENDING').length} icon={<FileBarChart2 className="h-5 w-5" />} accent="warning" />
        <StatCard label="Approved" value={expenses.filter((item) => item.status === 'APPROVED').length} icon={<FileBarChart2 className="h-5 w-5" />} accent="green" />
        <StatCard label="Paid" value={expenses.filter((item) => item.status === 'PAID').length} icon={<CircleDollarSign className="h-5 w-5" />} accent="lime" />
      </section>
      <ExpensesTable expenses={expenses} onUpdated={onUpdated} />
    </div>
  );
}

function FundsView({ funds, overview, fundTypes, onCreateType, onCreateFund, onRecordPayment }: { funds: any[]; overview: any; fundTypes: any[]; onCreateType: () => void; onCreateFund: (type: any) => void; onRecordPayment: (fund: any) => void }) {
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Active Fund Campaigns" value={funds.filter((fund) => (fund.status ?? 'ACTIVE') === 'ACTIVE').length} icon={<CircleDollarSign className="h-5 w-5" />} accent="green" />
        <StatCard label="Fund Contributions This Month" value={money(overview?.fundContributionsThisMonth ?? overview?.totalFundContributions)} icon={<CircleDollarSign className="h-5 w-5" />} accent="lime" />
        <StatCard label="Available Balance" value={money(overview?.availableBalance ?? overview?.fundsAvailable)} icon={<CircleDollarSign className="h-5 w-5" />} accent="warning" />
        <StatCard label="Fund Types" value={fundTypes.length} icon={<FileBarChart2 className="h-5 w-5" />} accent="info" />
      </section>
      <Panel title="Create Fund From Type">
        <div className="flex flex-wrap gap-3">
          {fundTypes.map((type) => <button key={type.id} type="button" className={secondaryButtonClass} onClick={() => onCreateFund(type)}>{type.name}</button>)}
          <button type="button" className={secondaryButtonClass} onClick={onCreateType}><Plus className="inline h-4 w-4" /> Add More Option</button>
        </div>
      </Panel>
      <FundsGrid funds={funds} onRecordPayment={onRecordPayment} />
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="mb-4 text-sm font-semibold text-primary">{title}</h3>
      {children}
    </div>
  );
}

function WelfareTable({ members, onMember }: { members: any[]; onMember: (member: any) => void }) {
  const rows = members.map((item) => [
    <button key={item.id} type="button" onClick={() => onMember(item)} className="text-left font-semibold text-lime hover:text-lime/80">{item.memberName}</button>,
    item.memberId ?? item.membershipNumber ?? '-',
    item.phone ?? '-',
    <StatusBadge key={`${item.id}-initial`} status={item.initialPaymentStatus ?? 'INITIAL_DUE'} />,
    <StatusBadge key={`${item.id}-month`} status={item.currentMonthStatus ?? 'UNPAID'} />,
    money(item.amountDue),
    money(item.amountPaid),
    money(item.balance),
    item.lastPaymentDate ? new Date(item.lastPaymentDate).toLocaleDateString() : '-',
    <StatusBadge key={`${item.id}-status`} status={item.status ?? 'UNPAID'} />,
    <button key={`${item.id}-action`} type="button" onClick={() => onMember(item)} className={secondaryButtonClass}>View</button>,
  ]);
  return <DataTable columns={['Member', 'Member ID', 'Phone', 'Initial Payment Status', 'Current Month Status', 'Amount Due', 'Amount Paid', 'Balance', 'Last Payment Date', 'Status', 'Actions']} rows={rows} minWidthClass="min-w-[1320px]" />;
}

function ExpensesTable({ expenses, onUpdated }: { expenses: any[]; onUpdated?: (message: string) => void }) {
  async function run(action: 'approve' | 'reject' | 'paid', id: string) {
    if (action === 'approve') await financeService.approveExpense(id);
    if (action === 'reject') await financeService.rejectExpense(id);
    if (action === 'paid') await financeService.markExpensePaid(id);
    onUpdated?.('Expense status updated.');
  }
  const rows = expenses.map((item) => [
    new Date(item.expenseDate).toLocaleDateString(),
    item.title,
    item.category,
    item.fundName ?? item.fund?.name ?? 'Unassigned',
    money(item.amount, item.currency),
    item.requestedByName ?? 'Unassigned',
    item.approvedByName || '-',
    <StatusBadge key={item.id} status={item.status} />,
    <div key={`${item.id}-actions`} className="flex justify-end gap-2">
      {item.status === 'PENDING' ? <button type="button" className={secondaryButtonClass} onClick={() => run('approve', item.id)}>Approve</button> : null}
      {item.status === 'APPROVED' ? <button type="button" className={secondaryButtonClass} onClick={() => run('paid', item.id)}>Mark Paid</button> : null}
      {item.status === 'PENDING' ? <button type="button" className={dangerButtonClass} onClick={() => run('reject', item.id)}>Reject</button> : null}
    </div>,
  ]);
  return <DataTable columns={['Date', 'Title', 'Category', 'Fund/Campaign', 'Amount', 'Requested By', 'Approved By', 'Status', 'Actions']} rows={rows} minWidthClass="min-w-[1120px]" />;
}

function FundsGrid({ funds, onRecordPayment }: { funds: any[]; onRecordPayment: (fund: any) => void }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {funds.map((fund) => {
        const collected = Number(fund.amountCollected ?? fund.currentBalance ?? 0);
        const target = Number(fund.targetAmount ?? fund.openingBalance ?? 0);
        const balance = Math.max(target - collected, 0);
        const progress = target > 0 ? Math.min(100, Math.round((collected / target) * 100)) : 0;
        return (
          <div key={fund.id} className="rounded-lg border border-border bg-card p-5 transition hover:bg-hover">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-primary">{fund.title ?? fund.name}</h3>
                <p className="mt-1 text-sm text-secondary">{fund.fundTypeName ?? (fund.restricted ? 'Pledges' : 'Temple Sacrifice')}</p>
              </div>
              <StatusBadge status={fund.status ?? 'ACTIVE'} />
            </div>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-secondary">Goal amount</span><span className="font-semibold text-primary">{money(target)}</span></div>
              <div className="flex justify-between"><span className="text-secondary">Amount collected</span><span className="text-primary">{money(collected)}</span></div>
              <div className="flex justify-between"><span className="text-secondary">Balance remaining</span><span className="text-primary">{money(balance)}</span></div>
              <div className="h-2 rounded-full bg-surface"><div className="h-2 rounded-full bg-lime" style={{ width: `${progress}%` }} /></div>
              <p className="text-xs text-secondary">{progress}% collected</p>
              <button type="button" className={buttonClass} onClick={() => onRecordPayment(fund)}>Record Fund Payment</button>
            </div>
          </div>
        );
      })}
      {!funds.length ? <div className="rounded-lg border border-border bg-card p-6 text-sm text-secondary">No fund campaigns found.</div> : null}
    </div>
  );
}

function HistoryTable({ history, compact = false }: { history: any[]; compact?: boolean }) {
  const rows = history.map((item) => [
    new Date(item.date).toLocaleDateString(),
    <Badge key={`${item.id}-type`}>{item.type}</Badge>,
    item.description,
    item.party ?? '-',
    item.fund ?? 'Unassigned',
    money(item.amount, item.currency),
    <Badge key={`${item.id}-direction`} className={item.direction === 'Inflow' ? 'border-green/40 bg-green/10 text-green' : item.direction === 'Outflow' ? 'border-danger/40 bg-danger/10 text-danger' : 'border-border bg-surface text-secondary'}>{item.direction}</Badge>,
    <StatusBadge key={`${item.id}-status`} status={item.status ?? 'Recorded'} />,
    compact ? null : item.createdBy ?? '-',
    compact ? null : item.receiptNumber ? `Receipt ${item.receiptNumber}` : '-',
  ].filter((cell) => cell !== null));
  return <DataTable columns={compact ? ['Date', 'Type', 'Description', 'Person/Member', 'Fund/Campaign', 'Amount', 'Direction', 'Status'] : ['Date', 'Type', 'Description', 'Person/Member', 'Fund/Campaign', 'Amount', 'Direction', 'Status', 'Created By', 'Actions']} rows={rows} minWidthClass={compact ? 'min-w-[940px]' : 'min-w-[1280px]'} />;
}

function RecordWelfarePaymentModal({ open, onClose, onSaved, members }: { open: boolean; onClose: () => void; onSaved: () => void; members: any[] }) {
  const [form, setForm] = useState({ memberId: '', memberName: '', paymentType: 'MONTHLY_PAYMENT', month: currentMonth(), year: currentYear(), amount: '5', paymentMethod: 'CASH', paymentReference: '', paymentDate: today(), receivedBy: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (form.paymentType === 'INITIAL_PAYMENT') setForm((current) => ({ ...current, amount: '10' }));
    if (form.paymentType === 'MONTHLY_PAYMENT') setForm((current) => ({ ...current, amount: '5' }));
  }, [form.paymentType]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!form.memberId) return setError('Member is required.');
    if (!form.paymentType) return setError('Payment type is required.');
    if (!form.month || !form.year) return setError('Month and year are required.');
    if (Number(form.amount) <= 0) return setError('Amount must be greater than 0.');
    if (!form.paymentDate) return setError('Payment date is required.');
    setSaving(true);
    try {
      await financeService.recordWelfarePayment({ ...form, amount: Number(form.amount), month: Number(form.month), year: Number(form.year) });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record welfare payment.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal open={open} title="Record Welfare Payment" onClose={onClose} className="max-w-3xl">
      <FinanceFormError error={error} />
      <form className="mt-4 space-y-5" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Member">
            <PeopleSelector
              value={form.memberId}
              includeMembersOnly
              returnTo="/finance/welfare"
              placeholder="Search members by name, phone, or membership number"
              onChange={(person) => setForm({ ...form, memberId: person?.personId ?? '', memberName: person?.fullName ?? '' })}
            />
          </FormField>
          <SelectField labelText="Payment Type" value={form.paymentType} options={paymentTypes} onChange={(value) => setForm({ ...form, paymentType: value })} />
          <FormField label="Month"><input className={inputClass} type="number" min="1" max="12" value={form.month} onChange={(event) => setForm({ ...form, month: event.target.value })} /></FormField>
          <FormField label="Year"><input className={inputClass} type="number" min="2000" value={form.year} onChange={(event) => setForm({ ...form, year: event.target.value })} /></FormField>
          <FormField label="Amount"><input className={inputClass} type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></FormField>
          <SelectField labelText="Payment Method" value={form.paymentMethod} options={paymentMethods} onChange={(value) => setForm({ ...form, paymentMethod: value })} />
          <FormField label="Payment Reference"><input className={inputClass} value={form.paymentReference} onChange={(event) => setForm({ ...form, paymentReference: event.target.value })} /></FormField>
          <FormField label="Payment Date"><input className={inputClass} type="date" value={form.paymentDate} onChange={(event) => setForm({ ...form, paymentDate: event.target.value })} /></FormField>
          <FormField label="Received By"><input className={inputClass} value={form.receivedBy} onChange={(event) => setForm({ ...form, receivedBy: event.target.value })} /></FormField>
          <FormField label="Note"><textarea className={inputClass} rows={2} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></FormField>
        </div>
        <ModalActions saving={saving} saveLabel="Record Welfare Payment" onClose={onClose} />
      </form>
    </Modal>
  );
}

function AddExpenseModal({ open, onClose, onSaved, funds }: { open: boolean; onClose: () => void; onSaved: () => void; funds: any[] }) {
  const [form, setForm] = useState({ title: '', description: '', category: 'Utilities', fundId: '', amount: '', currency: 'GHS', paymentMethod: 'CASH', vendorName: '', expenseDate: today(), dueDate: '', requestedBy: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    if (!form.title.trim()) return setError('Title is required.');
    if (!form.fundId) return setError('Fund is required.');
    if (Number(form.amount) <= 0) return setError('Amount must be greater than 0.');
    setSaving(true);
    try {
      await financeService.createExpense({ ...form, amount: Number(form.amount) });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save expense.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal open={open} title="Add Expense" subtitle="Submit a church spending request for approval." onClose={onClose} className="max-w-3xl">
      <FinanceFormError error={error} />
      <form className="mt-4 space-y-5" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Expense Title"><input className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></FormField>
          <SelectField labelText="Category" value={form.category} options={expenseCategories} onChange={(value) => setForm({ ...form, category: value })} />
          <FundSelect funds={funds} value={form.fundId} onChange={(value) => setForm({ ...form, fundId: value })} />
          <FormField label="Amount"><input className={inputClass} type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></FormField>
          <SelectField labelText="Payment Method" value={form.paymentMethod} options={paymentMethods} onChange={(value) => setForm({ ...form, paymentMethod: value })} />
          <FormField label="Vendor Name"><input className={inputClass} value={form.vendorName} onChange={(event) => setForm({ ...form, vendorName: event.target.value })} /></FormField>
          <FormField label="Expense Date"><input className={inputClass} type="date" value={form.expenseDate} onChange={(event) => setForm({ ...form, expenseDate: event.target.value })} /></FormField>
          <FormField label="Due Date"><input className={inputClass} type="date" value={form.dueDate} onChange={(event) => setForm({ ...form, dueDate: event.target.value })} /></FormField>
          <FormField label="Requested By"><input className={inputClass} value={form.requestedBy} onChange={(event) => setForm({ ...form, requestedBy: event.target.value })} /></FormField>
          <FormField label="Description"><textarea className={inputClass} rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></FormField>
        </div>
        <ModalActions saving={saving} saveLabel="Save Expense" onClose={onClose} />
      </form>
    </Modal>
  );
}

function CreateFundTypeModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (item: any) => void }) {
  const [form, setForm] = useState({ name: '', description: '', defaultTargetAmount: '', defaultDuration: '', requiresTargetAmount: true, requiresDeadline: true, requiresContributor: true, requirePhoneNumber: false, requireDepartment: false, requirePaymentSchedule: false, requireNote: true, status: 'ACTIVE' });
  const [questions, setQuestions] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const requirementFields: Array<[keyof typeof form, string]> = [
    ['requiresTargetAmount', 'Is target amount required?'],
    ['requiresDeadline', 'Is deadline required?'],
    ['requiresContributor', 'Require member/contributor name?'],
    ['requirePhoneNumber', 'Require phone number?'],
    ['requireDepartment', 'Require department/group?'],
    ['requirePaymentSchedule', 'Require payment schedule?'],
    ['requireNote', 'Require note?'],
  ];
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return setError('Fund type name is required.');
    setSaving(true);
    try {
      const result = await financeService.createFundType({ ...form, defaultTargetAmount: Number(form.defaultTargetAmount || 0), customFields: questions });
      onSaved(result.item);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create fund type.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal open={open} title="Fund Type Builder" onClose={onClose} className="max-w-4xl">
      <FinanceFormError error={error} />
      <form className="mt-4 space-y-5" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Fund Type Name"><input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FormField>
          <FormField label="Description"><input className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></FormField>
          <FormField label="Default Target Amount"><input className={inputClass} type="number" min="0" step="0.01" value={form.defaultTargetAmount} onChange={(event) => setForm({ ...form, defaultTargetAmount: event.target.value })} /></FormField>
          <FormField label="Default Duration"><input className={inputClass} value={form.defaultDuration} onChange={(event) => setForm({ ...form, defaultDuration: event.target.value })} /></FormField>
          {requirementFields.map(([key, text]) => <label key={key} className="flex items-center gap-3 text-sm text-secondary"><input type="checkbox" checked={Boolean(form[key])} onChange={(event) => setForm({ ...form, [key]: event.target.checked })} /> {text}</label>)}
        </div>
        <Panel title="Custom Questions">
          <div className="space-y-3">
            {questions.map((question, index) => (
              <div key={question.id} className="grid gap-3 rounded-lg border border-border bg-surface p-3 md:grid-cols-[1fr_10rem_6rem_5rem]">
                <input className={inputClass} placeholder="Label" value={question.label} onChange={(event) => setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value } : item))} />
                <select className={inputClass} value={question.type} onChange={(event) => setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value } : item))}>
                  {['text', 'number', 'amount', 'date', 'select', 'checkbox', 'textarea', 'member', 'file'].map((type) => <option key={type} value={type}>{label(type)}</option>)}
                </select>
                <label className="flex items-center gap-2 text-sm text-secondary"><input type="checkbox" checked={question.required} onChange={(event) => setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, required: event.target.checked } : item))} /> Required</label>
                <button type="button" className={dangerButtonClass} onClick={() => setQuestions((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
              </div>
            ))}
            <button type="button" className={secondaryButtonClass} onClick={() => setQuestions((items) => [...items, { id: `field_${Date.now()}`, label: '', type: 'text', required: false, placeholder: '', options: [], helperText: '' }])}>Add Question</button>
          </div>
        </Panel>
        <ModalActions saving={saving} saveLabel="Save Fund Type" onClose={onClose} />
      </form>
    </Modal>
  );
}

function CreateFundCampaignModal({ open, onClose, onSaved, fundTypes, selectedType, onChooseType, onCreateType }: { open: boolean; onClose: () => void; onSaved: () => void; fundTypes: any[]; selectedType: any; onChooseType: (type: any) => void; onCreateType: () => void }) {
  const [form, setForm] = useState({ title: '', description: '', targetAmount: '', currency: 'GHS', startDate: today(), endDate: '', status: 'ACTIVE', notes: '', contributorName: '', phone: '', department: '', paymentSchedule: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!selectedType) return;
    setForm((current) => ({ ...current, targetAmount: selectedType.defaultTargetAmount ? String(selectedType.defaultTargetAmount) : current.targetAmount }));
  }, [selectedType]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedType) return setError('Choose a fund type first.');
    if (!form.title.trim()) return setError('Fund title is required.');
    if (selectedType.requiresTargetAmount && Number(form.targetAmount) <= 0) return setError('Target amount is required.');
    if (selectedType.requiresDeadline && !form.endDate) return setError('Deadline is required.');
    setSaving(true);
    try {
      await financeService.createFundCampaign({ ...form, fundTypeId: selectedType.id, fundTypeName: selectedType.name, name: form.title, openingBalance: Number(form.targetAmount || 0), targetAmount: Number(form.targetAmount || 0), restricted: selectedType.name.toLowerCase().includes('pledge') });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create fund.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal open={open} title={selectedType ? `Create ${selectedType.name} Fund` : 'Choose Fund Type'} onClose={onClose} className="max-w-4xl">
      {!selectedType ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {fundTypes.map((type) => <button key={type.id} type="button" className={secondaryButtonClass} onClick={() => onChooseType(type)}>{type.name}</button>)}
          <button type="button" className={secondaryButtonClass} onClick={onCreateType}>Add More Option</button>
        </div>
      ) : (
        <>
          <FinanceFormError error={error} />
          <form className="mt-4 space-y-5" onSubmit={submit}>
            <div className="grid gap-4 md:grid-cols-2">
              <FormField label="Fund Title"><input className={inputClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} /></FormField>
              <FormField label="Target Amount"><input className={inputClass} type="number" min="0" step="0.01" value={form.targetAmount} onChange={(event) => setForm({ ...form, targetAmount: event.target.value })} /></FormField>
              <FormField label="Start Date"><input className={inputClass} type="date" value={form.startDate} onChange={(event) => setForm({ ...form, startDate: event.target.value })} /></FormField>
              <FormField label="End Date"><input className={inputClass} type="date" value={form.endDate} onChange={(event) => setForm({ ...form, endDate: event.target.value })} /></FormField>
              <SelectField labelText="Status" value={form.status} options={fundStatuses} onChange={(value) => setForm({ ...form, status: value })} />
              <FormField label="Contributor/Member"><input className={inputClass} value={form.contributorName} onChange={(event) => setForm({ ...form, contributorName: event.target.value })} /></FormField>
              <FormField label="Department/Group"><input className={inputClass} value={form.department} onChange={(event) => setForm({ ...form, department: event.target.value })} /></FormField>
              <FormField label="Payment Schedule"><input className={inputClass} value={form.paymentSchedule} onChange={(event) => setForm({ ...form, paymentSchedule: event.target.value })} /></FormField>
              <FormField label="Description"><textarea className={inputClass} rows={2} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></FormField>
              <FormField label="Notes"><textarea className={inputClass} rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></FormField>
            </div>
            <ModalActions saving={saving} saveLabel="Create Fund" onClose={onClose} />
          </form>
        </>
      )}
    </Modal>
  );
}

function RecordFundPaymentModal({ fund, onClose, onSaved }: { fund: any | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ contributorId: '', contributorName: '', amount: '', currency: 'GHS', paymentMethod: 'CASH', paymentReference: '', paymentDate: today(), receivedBy: '', note: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!fund) return;
    if (Number(form.amount) <= 0) return setError('Amount must be greater than 0.');
    setSaving(true);
    try {
      await financeService.recordFundPayment(fund.id, { ...form, amount: Number(form.amount) });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record fund payment.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal open={Boolean(fund)} title="Record Fund Payment" subtitle={fund ? fund.title ?? fund.name : undefined} onClose={onClose}>
      <FinanceFormError error={error} />
      <form className="mt-4 space-y-4" onSubmit={submit}>
        <FormField label="Contributor">
          <PeopleSelector
            value={form.contributorId}
            returnTo="/finance/funds"
            placeholder="Search people or members"
            onChange={(person) => setForm({ ...form, contributorId: person?.personId ?? '', contributorName: person?.fullName ?? '' })}
          />
        </FormField>
        <FormField label="External Contributor Name"><input className={inputClass} value={form.contributorName} onChange={(event) => setForm({ ...form, contributorId: '', contributorName: event.target.value })} /></FormField>
        <FormField label="Amount"><input className={inputClass} type="number" min="0" step="0.01" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value })} /></FormField>
        <SelectField labelText="Payment Method" value={form.paymentMethod} options={paymentMethods} onChange={(value) => setForm({ ...form, paymentMethod: value })} />
        <FormField label="Payment Reference"><input className={inputClass} value={form.paymentReference} onChange={(event) => setForm({ ...form, paymentReference: event.target.value })} /></FormField>
        <FormField label="Payment Date"><input className={inputClass} type="date" value={form.paymentDate} onChange={(event) => setForm({ ...form, paymentDate: event.target.value })} /></FormField>
        <FormField label="Received By"><input className={inputClass} value={form.receivedBy} onChange={(event) => setForm({ ...form, receivedBy: event.target.value })} /></FormField>
        <FormField label="Note"><textarea className={inputClass} rows={2} value={form.note} onChange={(event) => setForm({ ...form, note: event.target.value })} /></FormField>
        <ModalActions saving={saving} saveLabel="Record Fund Payment" onClose={onClose} />
      </form>
    </Modal>
  );
}

function MemberDetailModal({ member, payments, onClose }: { member: any | null; payments: any[]; onClose: () => void }) {
  const memberPayments = useMemo(() => payments.filter((payment) => payment.memberId === member?.id), [payments, member]);
  return (
    <Modal open={Boolean(member)} title={member?.memberName ?? 'Member Welfare'} subtitle={member?.phone} onClose={onClose} className="max-w-3xl">
      {member ? (
        <div className="space-y-5">
          <section className="grid gap-3 md:grid-cols-3">
            <StatCard label="Total Paid" value={money(member.amountPaid)} icon={<HandCoins className="h-5 w-5" />} accent="green" />
            <StatCard label="Outstanding Balance" value={money(member.balance)} icon={<HandCoins className="h-5 w-5" />} accent="warning" />
            <StatCard label="Arrears" value={money(member.arrears)} icon={<FileBarChart2 className="h-5 w-5" />} accent="danger" />
          </section>
          <HistoryTable history={memberPayments.map((payment) => ({ id: payment.id, date: payment.paymentDate, type: 'Welfare', description: label(payment.paymentType), party: member.memberName, fund: `${payment.month}/${payment.year}`, amount: payment.amount, currency: payment.currency, direction: 'Inflow', status: 'RECORDED', createdBy: payment.receivedByName ?? '-' }))} compact />
        </div>
      ) : null}
    </Modal>
  );
}

function FinanceFormError({ error }: { error: string }) {
  return error ? <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null;
}

function ModalActions({ saving, saveLabel, onClose }: { saving: boolean; saveLabel: string; onClose: () => void }) {
  return (
    <div className="flex justify-end gap-3 border-t border-border pt-4">
      <button type="button" onClick={onClose} className={secondaryButtonClass}>Cancel</button>
      <button type="submit" disabled={saving} className={buttonClass}>{saving ? 'Saving...' : saveLabel}</button>
    </div>
  );
}

function SelectField({ labelText, value, options, onChange }: { labelText: string; value: string; options: Array<string | { label: string; value: string }>; onChange: (value: string) => void }) {
  return (
    <FormField label={labelText}>
      <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select {labelText.toLowerCase()}</option>
        {options.map((option) => {
          const normalized = typeof option === 'string' ? { label: label(option), value: option } : option;
          return <option key={normalized.value} value={normalized.value}>{normalized.label}</option>;
        })}
      </select>
    </FormField>
  );
}

function FundSelect({ funds, value, onChange }: { funds: any[]; value: string; onChange: (value: string) => void }) {
  const options = useMemo(() => funds.filter((fund) => (fund.status ?? 'ACTIVE') === 'ACTIVE'), [funds]);
  return (
    <FormField label="Fund/Campaign">
      <select className={inputClass} value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select fund</option>
        {options.map((fund) => <option key={fund.id} value={fund.id}>{fund.title ?? fund.name}</option>)}
      </select>
    </FormField>
  );
}
