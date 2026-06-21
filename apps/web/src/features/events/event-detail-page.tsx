'use client';

import { FormEvent, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Car, Pencil, Plus, Users, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { ChartCard } from '@/components/charts/chart-card';
import { EventsAttendanceChart } from '@/components/charts/events-attendance-chart';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { eventsService } from '@/lib/services/events.service';

const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none transition placeholder:text-muted focus:border-lime';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-lime to-green px-4 py-3 text-sm font-semibold text-darkGreen transition hover:brightness-110 disabled:opacity-60';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary disabled:opacity-50';
const dangerButton = 'inline-flex items-center justify-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger transition hover:bg-danger/20';

function label(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' });
}

function number(value: unknown) {
  return Number(value ?? 0).toLocaleString();
}

function statusBadge(status: string) {
  const classes: Record<string, string> = {
    UPCOMING: 'border-lime/40 bg-lime/10 text-lime',
    ONGOING: 'border-green/40 bg-green/10 text-green',
    COMPLETED: 'border-info/40 bg-info/10 text-info',
    CANCELLED: 'border-danger/40 bg-danger/10 text-danger',
    DRAFT: 'border-warning/40 bg-warning/10 text-warning',
  };
  return <Badge className={classes[status] ?? classes.UPCOMING}>{label(status)}</Badge>;
}

export function EventDetailPageClient({
  initialData,
  currentUser,
}: {
  initialData: any;
  currentUser: any;
}) {
  const [data, setData] = useState(initialData);
  const [recordOpen, setRecordOpen] = useState(false);
  const event = data.item;
  const stats = data.attendanceStats ?? {};
  const attendance = data.attendance ?? [];
  const eventAttendanceChart = attendance.map((record: any) => ({
    label: new Date(record.attendanceDate).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    attendance: Number(record.total ?? 0),
  }));

  async function refresh() {
    try {
      setData(await eventsService.getEventById(event.id));
    } catch (err) {
      showErrorToast(err, 'Unable to refresh event.');
    }
  }

  async function cancelEvent() {
    try {
      await eventsService.cancelEvent(event.id);
      showSuccessToast('Event cancelled successfully');
      await refresh();
    } catch (err) {
      showErrorToast(err, 'Unable to cancel event.');
    }
  }

  const rows = useMemo(
    () =>
      attendance.map((record: any) => [
        new Date(record.attendanceDate).toLocaleDateString(),
        record.sectionName ?? 'Event',
        record.serviceTitle,
        number(record.values?.men),
        number(record.values?.women),
        number(Number(record.values?.boys ?? 0) + Number(record.values?.girls ?? 0)),
        number(record.total),
        number(record.totalVehicles ?? Number(record.values?.cars ?? 0) + Number(record.values?.bicycles ?? 0) + Number(record.values?.motors ?? 0)),
        record.recordedByName ?? '-',
        record.notes ?? '-',
      ]),
    [attendance],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title={event.title}
        subtitle={`${label(event.eventType)} - ${formatDateTime(event.startDateTime)} to ${formatDateTime(event.endDateTime)}`}
        actions={
          <>
            <Link href="/events" className={secondaryButton}>Back to Events</Link>
            <button type="button" className={primaryButton} onClick={() => setRecordOpen(true)}><Plus className="h-4 w-4" />Record Attendance</button>
            <button type="button" className={secondaryButton}><Pencil className="h-4 w-4" />Edit Event</button>
            <button type="button" className={dangerButton} onClick={cancelEvent}><XCircle className="h-4 w-4" />Cancel Event</button>
          </>
        }
      />

      <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="rounded-lg border border-border bg-card p-5">
          <div className="flex flex-wrap items-center gap-2">
            {statusBadge(event.displayStatus ?? event.status)}
            <Badge>{event.isPublic ? 'Public' : 'Private'}</Badge>
            <Badge>{event.registrationRequired ? 'Registration Required' : 'No Registration'}</Badge>
          </div>
          <dl className="mt-5 grid gap-4 text-sm md:grid-cols-2">
            <Info label="Type" value={label(event.eventType)} />
            <Info label="Organizer" value={event.organizerName ?? '-'} />
            <Info label="Date and time" value={`${formatDateTime(event.startDateTime)} - ${new Date(event.endDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`} />
            <Info label="Location type" value={label(event.locationType ?? 'PHYSICAL')} />
            <Info label="Location" value={event.locationType === 'ONLINE' ? event.onlineLink || '-' : event.physicalLocation || event.location || '-'} />
            <Info label="Repeat" value={label(event.repeatType ?? 'NONE')} />
          </dl>
          {event.description ? <p className="mt-5 rounded-lg border border-border bg-surface p-4 text-sm text-secondary">{event.description}</p> : null}
        </div>
        <div className="rounded-lg border border-border bg-card p-5">
          <h3 className="text-sm font-semibold text-primary">Event Actions</h3>
          <div className="mt-4 grid gap-3">
            <button type="button" className={primaryButton} onClick={() => setRecordOpen(true)}>Record Event Attendance</button>
            <a href="#attendance-history" className={secondaryButton}>View Attendance History</a>
            <button type="button" className={dangerButton} onClick={cancelEvent}>Cancel Event</button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
        <StatCard label="Total People" value={stats.totalPeople ?? 0} icon={<Users className="h-5 w-5" />} />
        <StatCard label="Adults" value={stats.adults ?? 0} icon={<Users className="h-5 w-5" />} accent="green" />
        <StatCard label="Children" value={stats.children ?? 0} icon={<Users className="h-5 w-5" />} accent="info" />
        <StatCard label="Vehicles" value={stats.vehicles ?? 0} icon={<Car className="h-5 w-5" />} accent="warning" />
        <StatCard label="First Timers" value={stats.firstTimers ?? 0} icon={<Users className="h-5 w-5" />} accent="lime" />
        <StatCard label="Online" value={stats.onlineAttendees ?? 0} icon={<CalendarDays className="h-5 w-5" />} accent="danger" />
      </section>

      <ChartCard title="Event attendance" description="Attendance recorded for this event over time">
        <EventsAttendanceChart data={eventAttendanceChart} />
      </ChartCard>

      <section className="rounded-lg border border-border bg-card p-5">
        <h3 className="text-sm font-semibold text-primary">Attendance Breakdown</h3>
        {attendance.length ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['Men', stats.men],
              ['Women', stats.women],
              ['Boys', stats.boys],
              ['Girls', stats.girls],
              ['Cars', stats.cars],
              ['Bicycles', stats.bicycles],
              ['Motors', stats.motors],
            ].map(([name, value]) => (
              <div key={name} className="rounded-lg border border-border bg-surface px-4 py-3">
                <p className="text-xs text-secondary">{name}</p>
                <p className="mt-1 text-xl font-semibold text-primary">{number(value)}</p>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No attendance recorded yet for this event." description="Record attendance to sync this event with the main Attendance history." action={<button type="button" className={primaryButton} onClick={() => setRecordOpen(true)}>Record Attendance</button>} />
        )}
      </section>

      <section id="attendance-history" className="rounded-lg border border-border bg-card p-5">
        <h3 className="mb-4 text-sm font-semibold text-primary">Attendance History for This Event</h3>
        {rows.length ? (
          <DataTable columns={['Date', 'Source', 'Event Name', 'Men', 'Women', 'Children', 'Total People', 'Vehicles', 'Recorded By', 'Notes']} rows={rows} minWidthClass="min-w-[1180px]" />
        ) : (
          <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary">No attendance recorded yet.</p>
        )}
      </section>

      <RecordEventAttendanceDialog
        open={recordOpen}
        event={event}
        currentUser={currentUser}
        onClose={() => setRecordOpen(false)}
        onSaved={async () => {
          showSuccessToast('Event attendance recorded successfully');
          setRecordOpen(false);
          await refresh();
        }}
      />
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase text-muted">{label}</dt>
      <dd className="mt-1 break-words text-primary">{value}</dd>
    </div>
  );
}

function RecordEventAttendanceDialog({
  open,
  event,
  currentUser,
  onClose,
  onSaved,
}: {
  open: boolean;
  event: any;
  currentUser: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    men: 0,
    women: 0,
    boys: 0,
    girls: 0,
    cars: 0,
    bicycles: 0,
    motors: 0,
    onlineAttendees: 0,
    firstTimers: 0,
    notes: '',
    recordedByName: currentUser?.name ?? '',
    attendanceDate: event?.eventDate ?? new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const totalPeople = form.men + form.women + form.boys + form.girls + form.onlineAttendees;
  const totalVehicles = form.cars + form.bicycles + form.motors;

  function update(key: string, value: unknown) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (totalPeople + totalVehicles + form.firstTimers <= 0) return showErrorToast('Enter at least one attendance value.');
    setSaving(true);
    try {
      await eventsService.recordEventAttendance(event.id, form);
      onSaved();
    } catch (err) {
      showErrorToast(err, 'Unable to record attendance.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title={`Record Attendance for ${event.title}`} onClose={onClose} className="max-w-4xl">
      <form className="space-y-5" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-3">
          <NumberField label="Men" value={form.men} onChange={(value) => update('men', value)} />
          <NumberField label="Women" value={form.women} onChange={(value) => update('women', value)} />
          <NumberField label="Boys / Children Male" value={form.boys} onChange={(value) => update('boys', value)} />
          <NumberField label="Girls / Children Female" value={form.girls} onChange={(value) => update('girls', value)} />
          {(event.locationType === 'ONLINE' || event.locationType === 'HYBRID') ? <NumberField label="Online Attendees" value={form.onlineAttendees} onChange={(value) => update('onlineAttendees', value)} /> : null}
          <NumberField label="First Timers" value={form.firstTimers} onChange={(value) => update('firstTimers', value)} />
          <NumberField label="Cars" value={form.cars} onChange={(value) => update('cars', value)} />
          <NumberField label="Bicycles" value={form.bicycles} onChange={(value) => update('bicycles', value)} />
          <NumberField label="Motors / Motorbikes" value={form.motors} onChange={(value) => update('motors', value)} />
          <FormField label="Attendance Date"><input className={inputClass} type="date" value={form.attendanceDate} onChange={(event) => update('attendanceDate', event.target.value)} /></FormField>
          <FormField label="Recorded By"><input className={inputClass} value={form.recordedByName} onChange={(event) => update('recordedByName', event.target.value)} /></FormField>
          <FormField label="Notes"><textarea className={inputClass} rows={2} value={form.notes} onChange={(event) => update('notes', event.target.value)} /></FormField>
        </div>
        <div className="grid gap-3 rounded-lg border border-border bg-surface p-4 text-sm md:grid-cols-3">
          <span>Adult Total: <strong className="text-lime">{number(form.men + form.women)}</strong></span>
          <span>Total People: <strong className="text-lime">{number(totalPeople)}</strong></span>
          <span>Total Vehicles: <strong className="text-lime">{number(totalVehicles)}</strong></span>
        </div>
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
          <button type="submit" disabled={saving} className={primaryButton}>{saving ? 'Saving...' : 'Save Attendance'}</button>
        </div>
      </form>
    </Modal>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return (
    <FormField label={label}>
      <input className={inputClass} type="number" min="0" value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </FormField>
  );
}
