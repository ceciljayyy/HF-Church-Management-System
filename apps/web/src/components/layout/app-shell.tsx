'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { LAYOUT } from '@/lib/layout-constants';

export function AppShell({
  user,
  churchProfile,
  children,
}: {
  user: { name: string; email: string; branchName?: string };
  churchProfile?: { churchName?: string; branchName?: string | null; logoUrl?: string | null } | null;
  children: ReactNode;
}) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopSidebarCollapsed, setDesktopSidebarCollapsed] = useState(false);
  const pathname = usePathname();
  const sidebarWidth = desktopSidebarCollapsed ? LAYOUT.sidebarCollapsed : LAYOUT.sidebarExpanded;

  useEffect(() => {
    const saved = window.localStorage.getItem('sidebar-collapsed');
    setDesktopSidebarCollapsed(saved === 'true');
  }, []);

  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!mobileSidebarOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setMobileSidebarOpen(false);
    }

    window.addEventListener('keydown', closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closeOnEscape);
    };
  }, [mobileSidebarOpen]);

  function toggleDesktopSidebar() {
    setDesktopSidebarCollapsed((collapsed) => {
      const next = !collapsed;
      window.localStorage.setItem('sidebar-collapsed', String(next));
      return next;
    });
  }

  return (
    <div className="h-screen overflow-hidden bg-background text-primary">
      <Sidebar
        mobileOpen={mobileSidebarOpen}
        collapsed={desktopSidebarCollapsed}
        churchProfile={churchProfile}
        onToggleDesktop={toggleDesktopSidebar}
        onCloseMobile={() => setMobileSidebarOpen(false)}
        onNavigate={() => setMobileSidebarOpen(false)}
      />
      {mobileSidebarOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-background/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileSidebarOpen(false)}
        />
      ) : null}
      <div
        style={{
          ['--sidebar-offset' as string]: `${sidebarWidth}px`,
        }}
        className="flex h-screen min-w-0 flex-col overflow-y-auto overflow-x-hidden transition-[padding] duration-200 lg:pl-[var(--sidebar-offset)]"
      >
        <Topbar
          user={user}
          churchProfile={churchProfile}
          sidebarOpen={mobileSidebarOpen}
          onToggleSidebar={() => setMobileSidebarOpen((open) => !open)}
        />
        <main className="min-w-0 flex-1 overflow-x-hidden px-3 py-4 sm:px-4 md:px-5 lg:px-6">{children}</main>
      </div>
    </div>
  );
}
