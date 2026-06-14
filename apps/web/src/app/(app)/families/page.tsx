import { redirect } from 'next/navigation';

export default async function FamiliesPage() {
  redirect('/people');
}
