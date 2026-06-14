'use client';

import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { RightPanel } from './right-panel';

export function AppShell({ user, children }: { user: { name: string; email: string; branchName?: string }; children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const showRightPanel = pathname === '/dashboard';

  return (
    <div className="flex min-h-screen overflow-x-hidden bg-background text-primary">
      <Sidebar expanded={sidebarOpen} onToggle={() => setSidebarOpen((open) => !open)} onNavigate={() => setSidebarOpen(false)} />
      <div className="w-[4.75rem] shrink-0 lg:hidden" />
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar user={user} onToggleSidebar={() => setSidebarOpen((open) => !open)} />
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-4 md:px-5 lg:px-6">{children}</main>
      </div>
      {showRightPanel ? <RightPanel /> : null}
    </div>
  );
}
