import { ModulePage } from '@/features/modules/module-page';

const requests = [
  ['Healing Prayer', 'Ama Boateng - assigned to Pastor John', 'Open'],
  ['Family Support', 'Private - pastoral team', 'Prayed For'],
  ['Job Opportunity', 'Public - intercessory team', 'Open'],
];

export default function PrayerRequestsPage() {
  return (
    <ModulePage
      title="Prayer Requests"
      description="Manage prayer needs, visibility, assigned leaders, and follow-up state."
      columns={['Request', 'Assignment', 'Status']}
      rows={requests}
      actionLabel="Add Request"
      filters={['Status', 'Visibility', 'Assigned To']}
    />
  );
}
