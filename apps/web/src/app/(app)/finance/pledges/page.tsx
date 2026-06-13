import { ModulePage } from '@/features/modules/module-page';

const pledges = [
  ['Building Fund Pledge', 'Ama Boateng - GHS 1,200 of GHS 2,000', 'Active'],
  ['Missions Support', 'Kwame Osei - GHS 800 of GHS 1,000', 'Active'],
  ['Equipment Drive', 'Priscilla Addo - GHS 500 of GHS 500', 'Completed'],
];

export default function PledgesPage() {
  return (
    <ModulePage
      title="Pledges"
      description="Track member pledges, payment progress, due dates, and follow-up status."
      columns={['Pledge', 'Progress', 'Status']}
      rows={pledges}
      actionLabel="Add Pledge"
      filters={['Status', 'Due Date', 'Export']}
    />
  );
}
