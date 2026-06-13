import { ModulePage } from '@/features/modules/module-page';

const careNotes = [
  ['Ama Boateng', 'Visit - assigned to Pastor A', 'Private'],
  ['Kwame Mensah', 'Counselling - assigned to Pastor B', 'Pastoral Team'],
  ['Priscilla Addo', 'Follow up - assigned to Leader C', 'Private'],
];

export default function PastoralCarePage() {
  return (
    <ModulePage
      title="Pastoral Care"
      description="Private care notes, visits, counselling records, and follow-up reminders."
      columns={['Person', 'Care Type', 'Visibility']}
      rows={careNotes}
      actionLabel="Add Care Note"
      filters={['Care Type', 'Visibility', 'Assigned To']}
    />
  );
}
