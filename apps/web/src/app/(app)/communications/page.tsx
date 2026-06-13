import { ModulePage } from '@/features/modules/module-page';

const campaigns = [
  ['Sunday Reminder', 'SMS - Members', 'Sent'],
  ['Youth Night', 'WhatsApp - Youth Ministry', 'Draft'],
  ['Prayer Meeting', 'Email - All branches', 'Scheduled'],
];

export default function CommunicationsPage() {
  return (
    <ModulePage
      title="Communications"
      description="Send announcements, reminders, campaign messages, and ministry updates."
      columns={['Campaign', 'Audience', 'Status']}
      rows={campaigns}
      actionLabel="Create Campaign"
      filters={['Channel', 'Status', 'Audience']}
    />
  );
}
