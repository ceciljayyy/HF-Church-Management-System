import { ModulePage } from '@/features/modules/module-page';

const funds = [
  ['Tithe', 'GHS 20,000 received', 'Active'],
  ['Building Fund', 'GHS 15,000 received', 'Active'],
  ['Missions', 'GHS 5,000 received', 'Active'],
];

export default function FundsPage() {
  return (
    <ModulePage
      title="Funds"
      description="Manage giving categories, balances, and fund status across the church."
      columns={['Fund', 'Balance', 'Status']}
      rows={funds}
      actionLabel="Create Fund"
      filters={['Status', 'Export']}
    />
  );
}
