import { redirect } from 'next/navigation';
import { ChurchProfileWizard } from '@/features/church-profile/church-profile-wizard';
import { serverApi } from '@/lib/server-api';

export default async function ChurchOnboardingPage() {
  const user = await serverApi.getCurrentUser();
  if (!user) redirect('/login');

  const status = await serverApi.getOnboardingStatus();
  if (status.onboardingCompleted) redirect('/dashboard');

  return <ChurchProfileWizard initialProfile={status.churchProfile} mode="onboarding" />;
}
