import { Badge } from '@/components/ui/badge';

const activities = [
  { title: 'Seed data loaded', meta: 'System - 2 min ago' },
  { title: 'New first timer', meta: 'Pastoral Care - 12 min ago' },
  { title: 'Contribution received', meta: 'Finance - 25 min ago' },
];

const notifications = [
  { title: 'Kiosk device active', meta: 'Main Lobby' },
  { title: 'Sunday service in 2 days', meta: 'Events' },
  { title: 'Finance approval pending', meta: 'Treasury' },
];

const birthdays = ['Ama Boateng', 'Daniel Osei'];
const followUps = ['Kofi Manu', 'Akua Serwaa'];

export function RightPanel() {
  return (
    <aside className="hidden w-80 border-l border-border bg-surface/90 px-5 py-6 xl:block">
      <div className="space-y-6">
        <section className="rounded-lg border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-primary">Notifications</h3>
            <Badge>Live</Badge>
          </div>
          <div className="mt-4 space-y-3">
            {notifications.map((item) => (
              <div key={item.title} className="rounded-lg border border-border bg-surface px-4 py-3">
                <p className="text-sm text-primary">{item.title}</p>
                <p className="mt-1 text-xs text-secondary">{item.meta}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-primary">Recent activity</h3>
          <div className="mt-4 space-y-3">
            {activities.map((item) => (
              <div key={item.title} className="rounded-lg border border-border bg-surface px-4 py-3">
                <p className="text-sm text-primary">{item.title}</p>
                <p className="mt-1 text-xs text-secondary">{item.meta}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-primary">Upcoming birthdays</h3>
          <div className="mt-4 space-y-2">
            {birthdays.map((name) => (
              <p key={name} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary">
                {name}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-primary">Follow ups</h3>
          <div className="mt-4 space-y-2">
            {followUps.map((name) => (
              <p key={name} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary">
                {name}
              </p>
            ))}
          </div>
        </section>
      </div>
    </aside>
  );
}
