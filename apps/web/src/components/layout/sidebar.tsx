'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Church,
  ClipboardCheck,
  Cog,
  FileBarChart2,
  HandCoins,
  HeartHandshake,
  Image,
  LayoutDashboard,
  MessageSquare,
  MonitorCheck,
  Shield,
  ScrollText,
  UserCheck,
  UserCog,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const sections = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/people', label: 'People', icon: Users },
      { href: '/departments', label: 'Departments', icon: Users },
      { href: '/events', label: 'Events', icon: CalendarDays },
      { href: '/attendance', label: 'Attendance', icon: ClipboardCheck },
      { href: '/kiosk', label: 'Kiosk Mode', icon: MonitorCheck },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/finance', label: 'Overview', icon: HandCoins },
      { href: '/finance/welfare', label: 'Welfare', icon: HandCoins },
      { href: '/finance/expenses', label: 'Expenses', icon: HandCoins },
      { href: '/finance/funds', label: 'Funds', icon: HandCoins },
      { href: '/finance/history', label: 'History', icon: ScrollText },
    ],
  },
  {
    label: 'Care',
    items: [
      { href: '/first-timers', label: 'First Timers', icon: UserCheck },
      { href: '/prayer-requests', label: 'Prayer Requests', icon: HeartHandshake },
      { href: '/pastoral-care', label: 'Pastoral Care', icon: Church },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/reports', label: 'Reports', icon: FileBarChart2 },
      { href: '/communications', label: 'Communications', icon: MessageSquare },
      { href: '/media', label: 'Media', icon: Image },
      { href: '/settings', label: 'Settings', icon: Cog },
      { href: '/admin/users', label: 'Users', icon: UserCog },
      { href: '/admin/roles', label: 'Roles', icon: Shield },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText },
    ],
  },
];

export function Sidebar({
  expanded,
  onToggle,
  onNavigate,
}: {
  expanded: boolean;
  onToggle: () => void;
  onNavigate: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex h-screen shrink-0 flex-col border-r border-border bg-surface/95 px-3 py-4 backdrop-blur transition-all duration-200 lg:sticky lg:z-20',
        expanded ? 'w-72 shadow-glow' : 'w-[4.75rem]',
        'lg:w-72 lg:px-4 lg:py-5 lg:shadow-none',
      )}
    >
      <div className={cn('mb-5 rounded-lg border border-border bg-card px-3 py-3 shadow-glow lg:px-4 lg:py-4', !expanded && 'lg:px-4')}>
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-lime text-sm font-black text-darkGreen">
            C
          </div>
          <div className={cn('min-w-0', !expanded && 'hidden lg:block')}>
            <p className="text-sm font-semibold text-primary">Church CMS</p>
            <p className="text-xs text-secondary">Premium Admin Suite</p>
          </div>
          <button
            type="button"
            aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
            onClick={onToggle}
            className="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border bg-surface text-secondary transition hover:bg-hover hover:text-primary lg:hidden"
          >
            {expanded ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        </div>
      </div>
      <nav className="space-y-5 overflow-y-auto pr-1">
        {sections.map((section) => (
          <div key={section.label}>
            <p className={cn('mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted', !expanded && 'hidden lg:block')}>
              {section.label}
            </p>
            <div className="space-y-1">
              {section.items.map(({ href, label, icon: Icon }) => {
                const active =
                  pathname === href ||
                  (href !== '/finance' && pathname.startsWith(`${href}/`));
                return (
                  <Link
                    key={href}
                    href={href}
                    title={label}
                    onClick={onNavigate}
                    className={cn(
                      'flex items-center gap-3 rounded-lg px-3 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary lg:px-4',
                      !expanded && 'justify-center lg:justify-start',
                      active &&
                        'bg-lime font-semibold text-darkGreen hover:bg-lime hover:text-darkGreen',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0 text-lime', active && 'text-darkGreen')} />
                    <span className={cn('truncate', !expanded && 'hidden lg:inline')}>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
