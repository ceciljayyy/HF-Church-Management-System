'use client';

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { DashboardRightPanelSkeleton } from '@/components/skeletons/dashboard-skeleton';
import { apiClient } from '@/lib/api-client';
import { LAYOUT } from '@/lib/layout-constants';

type ActivityItem = {
  id: string;
  actorName?: string;
  description?: string | null;
  action?: string;
  module?: string;
  entityType?: string;
  entityName?: string;
  createdAt?: string;
};

function formatMeta(item: ActivityItem) {
  const actor = item.actorName ?? 'System';
  const date = item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Recent';
  return `${actor} - ${date}`;
}

function titleFor(item: ActivityItem) {
  const action = item.action ? item.action.replaceAll('_', ' ').toLowerCase() : 'activity';
  return `${action} ${item.entityName ?? item.entityType ?? ''}`.trim();
}

export function RightPanel() {
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadActivities() {
      try {
        const payload = await apiClient.listResource('audit-logs', { limit: 6 });
        if (mounted) setActivities(payload.items ?? []);
      } catch {
        if (mounted) setActivities([]);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    loadActivities();
    const interval = window.setInterval(loadActivities, 30000);
    return () => {
      mounted = false;
      window.clearInterval(interval);
    };
  }, []);

  if (loading) return <DashboardRightPanelSkeleton />;

  return (
    <aside
      style={{ width: LAYOUT.rightPanel }}
      className="fixed inset-y-0 right-0 z-30 hidden h-screen overflow-y-auto overflow-x-hidden overscroll-contain border-l border-border bg-surface/90 px-5 py-6 pb-8 xl:block"
    >
      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary">Dashboard activity</h3>
            <Badge>Live</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {activities.slice(0, 3).map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface px-4 py-3">
                <p className="text-sm capitalize text-primary">{titleFor(item)}</p>
                <p className="mt-1 text-xs text-secondary">{formatMeta(item)}</p>
              </div>
            ))}
            {!activities.length ? <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary">No activity yet.</p> : null}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-primary">Recent activity</h3>
          <div className="mt-4 space-y-3">
            {activities.slice(3, 6).map((item) => (
              <div key={item.id} className="rounded-lg border border-border bg-surface px-4 py-3">
                <p className="text-sm capitalize text-primary">{titleFor(item)}</p>
                <p className="mt-1 text-xs text-secondary">{item.module ?? item.entityType ?? 'System'}</p>
              </div>
            ))}
            {activities.length <= 3 ? <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary">More updates will appear here.</p> : null}
          </div>
        </section>
      </div>
    </aside>
  );
}
