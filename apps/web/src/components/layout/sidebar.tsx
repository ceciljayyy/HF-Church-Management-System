'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  CalendarDays,
  Cake,
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
import { LAYOUT } from '@/lib/layout-constants';
import { canAny } from '@/lib/permissions';
import { cn } from '@/lib/utils';
import { SidebarToggle } from './sidebar-toggle';

const sections = [
  {
    label: 'Main',
    items: [
      { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { href: '/people', label: 'People', icon: Users, permissions: ['people.view'] },
      { href: '/departments', label: 'Departments', icon: Users, permissions: ['departments.view'] },
      { href: '/events', label: 'Events', icon: CalendarDays, permissions: ['events.view'] },
      { href: '/attendance', label: 'Attendance', icon: ClipboardCheck, permissions: ['attendance.view'] },
      { href: '/kiosk', label: 'Kiosk Mode', icon: MonitorCheck },
    ],
  },
  {
    label: 'Finance',
    items: [
      { href: '/finance', label: 'Overview', icon: HandCoins, permissions: ['finance.view'] },
      { href: '/finance/welfare', label: 'Welfare', icon: HandCoins, permissions: ['welfare.view'] },
      { href: '/finance/expenses', label: 'Expenses', icon: HandCoins, permissions: ['expenses.view', 'expenses.createForDepartment'] },
      { href: '/finance/funds', label: 'Funds', icon: HandCoins, permissions: ['funds.view'] },
      { href: '/finance/history', label: 'History', icon: ScrollText, permissions: ['finance.history.view', 'finance.view'] },
    ],
  },
  {
    label: 'Care',
    items: [
      { href: '/first-timers', label: 'First Timers', icon: UserCheck, permissions: ['people.view'] },
      { href: '/care/birthdays', label: 'Birthdays', icon: Cake, permissions: ['people.viewBirthdays', 'people.view'] },
      { href: '/prayer-requests', label: 'Prayer Requests', icon: HeartHandshake, permissions: ['people.view'] },
      { href: '/pastoral-care', label: 'Pastoral Care', icon: Church, permissions: ['people.view'] },
    ],
  },
  {
    label: 'System',
    items: [
      { href: '/reports', label: 'Reports', icon: FileBarChart2, permissions: ['reports.read'] },
      { href: '/communications', label: 'Communications', icon: MessageSquare, permissions: ['communications.view'] },
      { href: '/media', label: 'Media', icon: Image },
      { href: '/settings', label: 'Settings', icon: Cog, permissions: ['settings.view'] },
      { href: '/admin/users', label: 'Users', icon: UserCog, permissions: ['users.view'] },
      { href: '/admin/roles', label: 'Roles', icon: Shield, permissions: ['roles.view'] },
      { href: '/admin/audit-logs', label: 'Audit Logs', icon: ScrollText, permissions: ['auditLogs.view'] },
    ],
  },
];

export function Sidebar({
  mobileOpen,
  collapsed,
  churchProfile,
  permissions,
  onToggleDesktop,
  onCloseMobile,
  onNavigate,
}: {
  mobileOpen: boolean;
  collapsed: boolean;
  churchProfile?: { churchName?: string; branchName?: string | null; logoUrl?: string | null } | null;
  permissions?: string[];
  onToggleDesktop: () => void;
  onCloseMobile: () => void;
  onNavigate: () => void;
}) {
  const pathname = usePathname();
  const churchName = churchProfile?.churchName || 'Church CMS';
  const branchName = churchProfile?.branchName || 'Premium Admin Suite';
  const showLabels = !collapsed;

  return (
    <aside
      style={{
        ['--desktop-sidebar-width' as string]: `${collapsed ? LAYOUT.sidebarCollapsed : LAYOUT.sidebarExpanded}px`,
      }}
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex h-screen w-[min(300px,85vw)] shrink-0 flex-col overflow-hidden border-r border-border bg-surface/95 px-3 py-4 shadow-glow backdrop-blur transition-transform duration-200 lg:z-40 lg:w-[var(--desktop-sidebar-width)] lg:translate-x-0 lg:px-4 lg:py-5 lg:shadow-none lg:transition-[width]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}
    >
      <div className="mb-5 rounded-lg border border-border bg-card px-3 py-3 shadow-glow lg:px-4 lg:py-4">
        <div className="flex items-center gap-3">
          <div className={cn('flex h-11 w-11 items-center justify-center overflow-hidden rounded-lg bg-lime text-sm font-black text-darkGreen', !showLabels && 'lg:hidden')}>
            {churchProfile?.logoUrl ? <img src={churchProfile.logoUrl} alt="" className="h-full w-full object-cover" /> : churchName[0]}
          </div>
          <div className={cn('min-w-0 flex-1', !showLabels && 'lg:hidden')}>
            <p className="truncate text-sm font-semibold text-primary">{churchName}</p>
            <p className="truncate text-xs text-secondary">{branchName}</p>
          </div>
          <SidebarToggle
            expanded={mobileOpen}
            onClick={onCloseMobile}
            label="Close navigation"
            className="ml-auto lg:hidden"
          />
          <SidebarToggle
            expanded={!collapsed}
            onClick={onToggleDesktop}
            label={collapsed ? 'Expand navigation' : 'Collapse navigation'}
            className={cn('ml-auto hidden lg:inline-flex', !showLabels && 'mx-auto')}
          />
        </div>
      </div>
      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto overflow-x-hidden overscroll-contain pr-1">
        {sections.map((section) => {
          const items = section.items.filter((item) => canAny(permissions ?? [], item.permissions ?? []));
          if (!items.length) return null;
          return (
          <div key={section.label}>
            <p className={cn('mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-muted', !showLabels && 'lg:hidden')}>
              {section.label}
            </p>
            <div className="space-y-1">
              {items.map(({ href, label, icon: Icon }) => {
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
                      !showLabels && 'lg:justify-center',
                      active &&
                        'bg-lime font-semibold text-darkGreen hover:bg-lime hover:text-darkGreen',
                    )}
                  >
                    <Icon className={cn('h-4 w-4 shrink-0 text-lime', active && 'text-darkGreen')} />
                    <span className={cn('truncate', !showLabels && 'lg:hidden')}>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
          );
        })}
      </nav>
    </aside>
  );
}
