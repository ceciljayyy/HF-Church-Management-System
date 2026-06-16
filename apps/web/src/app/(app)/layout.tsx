import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { serverApi } from '@/lib/server-api';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await serverApi.getCurrentUser();
  if (!user) redirect('/login');
  const status = await serverApi.getOnboardingStatus();
  if (!status.onboardingCompleted) redirect('/onboarding/church');

  return (
    <AppShell
      user={{ name: user.name, email: user.email, branchName: user.branch?.name }}
      churchProfile={status.churchProfile}
    >
      {children}
    </AppShell>
  );
}
