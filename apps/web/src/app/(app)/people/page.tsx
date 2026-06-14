import { serverApi } from '@/lib/server-api';
import { PeoplePageClient } from '@/features/people/people-page';

export default async function PeoplePage({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams;
  const user = await serverApi.getCurrentUser();
  const data = await serverApi.listResource('people', { page: 1, limit: 20 });
  return (
    <PeoplePageClient
      initialData={data}
      permissions={user?.permissions ?? []}
      openAddUser={params?.openAddUser === 'true'}
      returnTo={typeof params?.returnTo === 'string' ? params.returnTo : undefined}
    />
  );
}
