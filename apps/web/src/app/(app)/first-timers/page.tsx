import { ModulePage } from '@/features/modules/module-page';

const firstTimers = [
  ['Kofi Manu', '024xxxxxxx - Sunday visit', 'New'],
  ['Akua Serwaa', '055xxxxxxx - Assigned to Leader B', 'Contacted'],
  ['Yaw Mensah', '020xxxxxxx - Interested in membership', 'Interested'],
];

export default function FirstTimersPage() {
  return (
    <ModulePage
      title="First Timers"
      description="Track visitors, assignments, follow-up progress, and conversion status."
      columns={['Name', 'Follow Up', 'Status']}
      rows={firstTimers}
      actionLabel="Add First Timer"
      filters={['Status', 'Assigned To', 'Export']}
    />
  );
}
