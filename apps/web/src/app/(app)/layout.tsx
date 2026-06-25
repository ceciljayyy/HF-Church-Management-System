import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/app-shell';
import { serverApi } from '@/lib/server-api';

export default async function AppLayout({ children }: { children: ReactNode }) {
  const [user, status] = await Promise.all([
    serverApi.getCurrentUser(),
    serverApi.getOnboardingStatus(),
  ]);

  if (!user) redirect('/login');
  if (!status.onboardingCompleted) redirect('/onboarding/church');

  return (
    <AppShell
      user={{
        name: user.name,
        email: user.email,
        branchName: user.branch?.name,
        permissions: user.permissions ?? [],
        roles: user.roles ?? [],
      }}
      churchProfile={status.churchProfile}
    >
      {children}
    </AppShell>
  );
}
