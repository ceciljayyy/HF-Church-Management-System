import { serverApi } from '@/lib/server-api';
import { DashboardView } from '@/features/dashboard/dashboard-view';

export default async function DashboardPage() {
  const summary = await serverApi.getDashboardSummary();
  return <DashboardView summary={summary} />;
}