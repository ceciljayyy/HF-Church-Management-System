import { serverApi } from '@/lib/server-api';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { DataTable } from '@/components/ui/data-table';
import { HandCoins, TrendingDown, CircleDollarSign } from 'lucide-react';

export default async function FinancePage() {
  const summary = await serverApi.listResource('finance');
  const contributions = await serverApi.listResource('finance/contributions');
  const expenses = await serverApi.listResource('finance/expenses');

  return (
    <div className="space-y-6">
      <PageHeader title="Finance" subtitle="Monitor contributions, tithes, offerings, expenses, and net balance across branches." />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Contributions" value={`$${Number(summary.contributions ?? 0).toFixed(2)}`} icon={<HandCoins className="h-5 w-5" />} accent="green" />
        <StatCard label="Expenses" value={`$${Number(summary.expenses ?? 0).toFixed(2)}`} icon={<TrendingDown className="h-5 w-5" />} accent="danger" />
        <StatCard label="Net balance" value={`$${Number(summary.netBalance ?? 0).toFixed(2)}`} icon={<CircleDollarSign className="h-5 w-5" />} accent="lime" />
      </section>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-primary">Recent contributions</h3>
          <DataTable columns={['Reference', 'Amount', 'Type']} rows={(contributions.items ?? []).slice(0, 6).map((item: any) => [item.reference ?? item.id, `$${Number(item.amount).toFixed(2)}`, item.type])} />
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-primary">Recent expenses</h3>
          <DataTable columns={['Title', 'Amount', 'Status']} rows={(expenses.items ?? []).slice(0, 6).map((item: any) => [item.title, `$${Number(item.amount).toFixed(2)}`, item.status])} />
        </div>
      </div>
    </div>
  );
}
