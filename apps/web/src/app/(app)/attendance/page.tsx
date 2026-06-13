import { serverApi } from '@/lib/server-api';
import { ModulePage } from '@/features/modules/module-page';

export default async function AttendancePage() {
  const { items = [] } = await serverApi.listResource('attendance');
  return <ModulePage title="Attendance" description="Track sessions, check-ins, and service attendance." rows={items.map((item: any) => [item.title, new Date(item.sessionDate).toLocaleDateString(), item.checkInMode])} />;
}