'use client';

import { useEffect, useState } from 'react';
import { Bell, Menu, Moon, Search, Sun } from 'lucide-react';
import { Avatar } from '@/components/ui/avatar';

export function Topbar({
  user,
  onToggleSidebar,
}: {
  user: { name: string; email: string; branchName?: string };
  onToggleSidebar: () => void;
}) {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = window.localStorage.getItem('theme');
    const nextTheme = saved === 'light' ? 'light' : 'dark';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('light', nextTheme === 'light');
  }, []);

  function toggleTheme() {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    window.localStorage.setItem('theme', nextTheme);
    document.documentElement.classList.toggle('light', nextTheme === 'light');
  }

  return (
    <header className="flex items-center justify-between gap-3 border-b border-border bg-background/80 px-3 py-3 backdrop-blur sm:px-4 lg:px-6 lg:py-4">
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={onToggleSidebar}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-secondary transition hover:bg-hover hover:text-primary lg:hidden"
        >
          <Menu className="h-4 w-4" />
        </button>
        <div className="min-w-0">
          <p className="hidden truncate text-xs uppercase tracking-[0.24em] text-secondary sm:block">
            Sunday Service Operations
          </p>
          <h2 className="truncate text-base font-semibold text-primary sm:mt-1 sm:text-lg">Welcome back, {user.name}</h2>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <button className="hidden rounded-lg border border-border bg-card p-3 text-secondary transition hover:bg-hover hover:text-primary sm:inline-flex">
          <Search className="h-4 w-4" />
        </button>
        <button className="rounded-lg border border-border bg-card p-3 text-secondary transition hover:bg-hover hover:text-primary">
          <Bell className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          onClick={toggleTheme}
          className="rounded-lg border border-border bg-card p-3 text-secondary transition hover:bg-hover hover:text-primary"
        >
          {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
        </button>
        <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-2 py-2 sm:px-4">
          <Avatar name={user.name} />
          <div className="hidden max-w-44 text-right md:block">
            <p className="text-sm font-medium text-primary">{user.name}</p>
            <p className="truncate text-xs text-secondary">{user.email}</p>
            {user.branchName ? <p className="text-xs text-lime">{user.branchName}</p> : null}
          </div>
        </div>
      </div>
    </header>
  );
}
