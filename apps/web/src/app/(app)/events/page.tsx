import { serverApi } from '@/lib/server-api';
import { EventsPageClient } from '@/features/events/events-page';

export default async function EventsPage() {
  const [initialData, currentUser, status] = await Promise.all([
    serverApi.listResource('events', { limit: 20 }),
    serverApi.getCurrentUser(),
    serverApi.getOnboardingStatus(),
  ]);

  return <EventsPageClient initialData={initialData} currentUser={currentUser} churchProfile={status.churchProfile} />;
}
