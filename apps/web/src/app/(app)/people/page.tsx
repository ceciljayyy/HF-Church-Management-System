import { serverApi } from '@/lib/server-api';
import { PeoplePageClient } from '@/features/people/people-page';

export default async function PeoplePage() {
  const user = await serverApi.getCurrentUser();
  const data = await serverApi.listResource('people', { page: 1, limit: 20 });
  return <PeoplePageClient initialData={data} permissions={user?.permissions ?? []} />;
}
