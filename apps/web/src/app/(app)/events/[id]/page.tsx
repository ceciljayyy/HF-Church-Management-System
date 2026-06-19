import { serverApi } from '@/lib/server-api';
import { EventDetailPageClient } from '@/features/events/event-detail-page';

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [initialData, currentUser] = await Promise.all([
    serverApi.request<any>(`/events/${id}`),
    serverApi.getCurrentUser(),
  ]);

  return <EventDetailPageClient initialData={initialData} currentUser={currentUser} />;
}
