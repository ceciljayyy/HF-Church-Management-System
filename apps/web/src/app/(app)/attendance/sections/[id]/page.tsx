import { AttendancePage } from '@/features/attendance/attendance-page';

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <AttendancePage mode="custom" sectionId={id} />;
}
