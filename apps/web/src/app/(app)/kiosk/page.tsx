import { MonitorCheck, UserCheck, Users } from 'lucide-react';
import { DataTable } from '@/components/ui/data-table';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';

const rows = [
  ['Ama Boateng', 'Choir', '8:15 AM', 'Present'],
  ['Kwame Mensah', 'Youth Ministry', '8:20 AM', 'Present'],
  ['Priscilla Addo', 'Media Team', '8:24 AM', 'Present'],
];

export default function KioskPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Kiosk Mode"
        subtitle="Fast check-in station for services, meetings, and ministry gatherings."
      />
      <section className="grid gap-4 md:grid-cols-3">
        <StatCard label="Checked in" value={356} icon={<MonitorCheck className="h-5 w-5" />} />
        <StatCard label="First timers" value={24} icon={<UserCheck className="h-5 w-5" />} accent="green" />
        <StatCard label="Expected people" value={2450} icon={<Users className="h-5 w-5" />} accent="info" />
      </section>
      <DataTable columns={['Name', 'Group', 'Time', 'Status']} rows={rows} />
    </div>
  );
}
