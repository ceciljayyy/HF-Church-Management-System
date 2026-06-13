import { serverApi } from '@/lib/server-api';
import { ModulePage } from '@/features/modules/module-page';

export default async function ExpensesPage() {
  const { items = [] } = await serverApi.listResource('finance/expenses');
  return <ModulePage title="Expenses" description="Manage approvals, payments, and receipts." rows={items.map((item: any) => [item.title, Number(item.amount).toFixed(2), item.status])} />;
}