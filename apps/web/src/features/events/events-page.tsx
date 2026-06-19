'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Copy, Eye, Filter, Pencil, Plus, UserCheck, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { FormField } from '@/components/ui/form-field';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { TableSkeleton } from '@/components/skeletons/table-skeleton';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { eventsService } from '@/lib/services/events.service';

const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none transition placeholder:text-muted focus:border-lime';
const primaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-lime to-green px-4 py-3 text-sm font-semibold text-darkGreen transition hover:brightness-110 disabled:opacity-60';
const secondaryButton = 'inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary disabled:opacity-50';
const dangerButton = 'inline-flex items-center justify-center gap-2 rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-sm font-semibold text-danger transition hover:bg-danger/20';

const eventTypes = [
  ['SERVICE', 'Service'],
  ['MEETING', 'Bible Study / Prayer'],
  ['YOUTH', 'Youth'],
  ['OUTREACH', 'Outreach'],
  ['CONFERENCE', 'Conference'],
  ['OTHER', 'Special Program'],
];

const statuses = [
  ['PUBLISHED', 'Upcoming / Published'],
  ['DRAFT', 'Draft'],
  ['COMPLETED', 'Completed'],
  ['CANCELLED', 'Cancelled'],
];

function label(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (match) => match.toUpperCase());
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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

function boolBadge(value: boolean, yes = 'Yes', no = 'No') {
  return <Badge className={value ? 'border-lime/40 bg-lime/10 text-lime' : 'border-muted/40 bg-muted/10 text-muted'}>{value ? yes : no}</Badge>;
}

function defaultLocation(churchProfile: any) {
  return [churchProfile?.streetAddress, churchProfile?.city, churchProfile?.stateOrRegion, churchProfile?.country].filter(Boolean).join(', ');
}

export function EventsPageClient({
  initialData,
  currentUser,
  churchProfile,
}: {
  initialData: any;
  currentUser: any;
  churchProfile: any;
}) {
  const [data, setData] = useState(initialData);
  const [filters, setFilters] = useState({ search: '', type: '', status: '', startDate: '', endDate: '' });
  const [filterOpen, setFilterOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadEvents(nextFilters = filters, page = data.pagination?.page ?? 1) {
    setLoading(true);
    try {
      const response = await eventsService.getEvents({ ...nextFilters, page, limit: data.pagination?.limit ?? 20 });
      setData(response);
    } catch (err) {
      showErrorToast(err, 'Unable to load events.');
    } finally {
      setLoading(false);
    }
  }

  async function cancelEvent(event: any) {
    try {
      await eventsService.cancelEvent(event.id);
      showSuccessToast('Event cancelled successfully');
      await loadEvents();
    } catch (err) {
      showErrorToast(err, 'Unable to cancel event.');
    }
  }

  async function duplicateEvent(event: any) {
    try {
      await eventsService.createEvent({
        ...event,
        title: `${event.title} Copy`,
        eventDate: event.eventDate,
        startTime: event.startTime,
        endTime: event.endTime,
      });
      showSuccessToast('Event duplicated successfully');
      await loadEvents();
    } catch (err) {
      showErrorToast(err, 'Unable to duplicate event.');
    }
  }

  const upcoming = useMemo(() => (data.items ?? []).filter((event: any) => event.displayStatus === 'UPCOMING').slice(0, 4), [data.items]);
  const completed = useMemo(() => (data.items ?? []).filter((event: any) => event.displayStatus === 'COMPLETED').slice(0, 4), [data.items]);
  const rows = useMemo(
    () =>
      (data.items ?? []).map((event: any) => [
        <Link key={`${event.id}-title`} href={`/events/${event.id}`} className="font-semibold text-primary hover:text-lime">{event.title}</Link>,
        <Badge>{label(event.eventType)}</Badge>,
        formatDate(event.startDateTime),
        `${formatTime(event.startDateTime)} - ${formatTime(event.endDateTime)}`,
        label(event.locationType ?? 'PHYSICAL'),
        event.locationType === 'ONLINE' ? event.onlineLink || '-' : event.physicalLocation || event.location || '-',
        event.organizerName ?? '-',
        boolBadge(Boolean(event.isPublic), 'Public', 'Private'),
        boolBadge(Boolean(event.registrationRequired), 'Required', 'No'),
        statusBadge(event.displayStatus ?? event.status),
        <div key={`${event.id}-actions`} className="flex flex-wrap justify-end gap-2">
          <Link href={`/events/${event.id}`} className={secondaryButton}><Eye className="h-4 w-4" />View</Link>
          <button type="button" className={secondaryButton} onClick={() => setEditEvent(event)}><Pencil className="h-4 w-4" />Edit</button>
          <button type="button" className={secondaryButton} onClick={() => duplicateEvent(event)}><Copy className="h-4 w-4" />Duplicate</button>
          <button type="button" className={dangerButton} onClick={() => cancelEvent(event)}><XCircle className="h-4 w-4" />Cancel</button>
        </div>,
      ]),
    [data.items],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Events"
        subtitle="Create, schedule, and track church services, programs, and special events."
        actions={
          <>
            <button type="button" className={secondaryButton} onClick={() => setFilterOpen(true)}><Filter className="h-4 w-4" />Filters</button>
            <button type="button" className={primaryButton} onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Create Event</button>
          </>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Upcoming Events" value={data.summary?.upcomingEvents ?? 0} icon={<CalendarDays className="h-5 w-5" />} />
        <StatCard label="Events This Month" value={data.summary?.eventsThisMonth ?? 0} icon={<CalendarDays className="h-5 w-5" />} accent="green" />
        <StatCard label="Public Events" value={data.summary?.publicEvents ?? 0} icon={<Eye className="h-5 w-5" />} accent="info" />
        <StatCard label="With Registration" value={data.summary?.registrationEvents ?? 0} icon={<UserCheck className="h-5 w-5" />} accent="warning" />
        <StatCard label="Average Attendance" value={data.summary?.averageAttendance ?? 0} icon={<UserCheck className="h-5 w-5" />} accent="lime" />
      </section>

      <section className="grid gap-5 xl:grid-cols-2">
        <EventPreview title="Upcoming events" items={upcoming} empty="No upcoming events match your filters." />
        <EventPreview title="Recent completed events" items={completed} empty="Completed events will appear here." />
      </section>

      {loading ? (
        <TableSkeleton rows={6} columns={11} showFilters={false} />
      ) : rows.length ? (
        <DataTable columns={['Event Name', 'Type', 'Date', 'Time', 'Location Type', 'Location', 'Organizer', 'Public/Private', 'Registration', 'Status', 'Actions']} rows={rows} minWidthClass="min-w-[1480px]" />
      ) : (
        <EmptyState title="No events found" description="Create a church service, program, meeting, or special event to get started." action={<button type="button" className={primaryButton} onClick={() => setCreateOpen(true)}>Create Event</button>} />
      )}

      <div className="flex flex-col gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm text-secondary sm:flex-row sm:items-center sm:justify-between">
        <span>{data.pagination?.total ?? data.items?.length ?? 0} total events</span>
        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <button type="button" className={secondaryButton} disabled={loading || (data.pagination?.page ?? 1) <= 1} onClick={() => loadEvents(filters, (data.pagination?.page ?? 1) - 1)}>Previous</button>
          <span className="whitespace-nowrap">Page {data.pagination?.page ?? 1} of {data.pagination?.totalPages ?? 1}</span>
          <button type="button" className={secondaryButton} disabled={loading || (data.pagination?.page ?? 1) >= (data.pagination?.totalPages ?? 1)} onClick={() => loadEvents(filters, (data.pagination?.page ?? 1) + 1)}>Next</button>
        </div>
      </div>

      <EventFiltersDialog
        open={filterOpen}
        filters={filters}
        onClose={() => setFilterOpen(false)}
        onApply={(next) => {
          setFilters(next);
          setFilterOpen(false);
          loadEvents(next, 1);
        }}
      />
      <EventDialog
        open={createOpen}
        mode="create"
        currentUser={currentUser}
        churchProfile={churchProfile}
        onClose={() => setCreateOpen(false)}
        onSaved={async () => {
          showSuccessToast('Event created successfully');
          setCreateOpen(false);
          await loadEvents(filters, 1);
        }}
      />
      <EventDialog
        open={Boolean(editEvent)}
        mode="edit"
        event={editEvent}
        currentUser={currentUser}
        churchProfile={churchProfile}
        onClose={() => setEditEvent(null)}
        onSaved={async () => {
          showSuccessToast('Event updated successfully');
          setEditEvent(null);
          await loadEvents();
        }}
      />
    </div>
  );
}

function EventPreview({ title, items, empty }: { title: string; items: any[]; empty: string }) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.map((event) => (
          <Link key={event.id} href={`/events/${event.id}`} className="block rounded-lg border border-border bg-surface px-4 py-3 transition hover:bg-hover">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-primary">{event.title}</p>
                <p className="mt-1 text-xs text-secondary">{formatDate(event.startDateTime)} at {formatTime(event.startDateTime)}</p>
              </div>
              {statusBadge(event.displayStatus ?? event.status)}
            </div>
          </Link>
        ))}
        {!items.length ? <p className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary">{empty}</p> : null}
      </div>
    </section>
  );
}

function EventFiltersDialog({ open, filters, onApply, onClose }: { open: boolean; filters: any; onApply: (filters: any) => void; onClose: () => void }) {
  const [draft, setDraft] = useState(filters);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onApply(draft);
  }
  return (
    <Modal open={open} title="Filter Events" subtitle="Find events by type, status, and date range." onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <FormField label="Search"><input className={inputClass} value={draft.search} onChange={(event) => setDraft({ ...draft, search: event.target.value })} placeholder="Event name or location" /></FormField>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Event type"><select className={inputClass} value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}><option value="">All types</option>{eventTypes.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></FormField>
          <FormField label="Status"><select className={inputClass} value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value })}><option value="">All statuses</option>{statuses.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></FormField>
          <FormField label="From"><input className={inputClass} type="date" value={draft.startDate} onChange={(event) => setDraft({ ...draft, startDate: event.target.value })} /></FormField>
          <FormField label="To"><input className={inputClass} type="date" value={draft.endDate} onChange={(event) => setDraft({ ...draft, endDate: event.target.value })} /></FormField>
        </div>
        <ModalActions saving={false} saveLabel="Apply Filters" onClose={onClose} />
      </form>
    </Modal>
  );
}

function EventDialog({
  open,
  mode,
  event,
  currentUser,
  churchProfile,
  onClose,
  onSaved,
}: {
  open: boolean;
  mode: 'create' | 'edit';
  event?: any;
  currentUser: any;
  churchProfile: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState<any>(() => ({
    title: event?.title ?? '',
    eventType: event?.eventType ?? 'SERVICE',
    description: event?.description ?? '',
    eventDate: event?.eventDate ?? today,
    startTime: event?.startTime ?? churchProfile?.defaultServiceTime ?? '09:00',
    endTime: event?.endTime ?? '11:00',
    locationType: event?.locationType ?? 'PHYSICAL',
    physicalLocation: event?.physicalLocation ?? defaultLocation(churchProfile),
    onlineLink: event?.onlineLink ?? '',
    organizerName: event?.organizerName ?? currentUser?.name ?? '',
    isPublic: event?.isPublic ?? true,
    registrationRequired: event?.registrationRequired ?? false,
    repeatType: event?.repeatType ?? 'NONE',
    maxAttendees: event?.maxAttendees ?? '',
    department: event?.department ?? '',
    tags: event?.tags ?? '',
  }));
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      title: event?.title ?? '',
      eventType: event?.eventType ?? 'SERVICE',
      description: event?.description ?? '',
      eventDate: event?.eventDate ?? today,
      startTime: event?.startTime ?? churchProfile?.defaultServiceTime ?? '09:00',
      endTime: event?.endTime ?? '11:00',
      locationType: event?.locationType ?? 'PHYSICAL',
      physicalLocation: event?.physicalLocation ?? defaultLocation(churchProfile),
      onlineLink: event?.onlineLink ?? '',
      organizerName: event?.organizerName ?? currentUser?.name ?? '',
      isPublic: event?.isPublic ?? true,
      registrationRequired: event?.registrationRequired ?? false,
      repeatType: event?.repeatType ?? 'NONE',
      maxAttendees: event?.maxAttendees ?? '',
      department: event?.department ?? '',
      tags: event?.tags ?? '',
    });
  }, [open, event?.id]);

  function update(key: string, value: unknown) {
    setForm((current: any) => ({ ...current, [key]: value }));
  }

  async function submit(submitEvent: FormEvent<HTMLFormElement>) {
    submitEvent.preventDefault();
    if (!form.title.trim()) return showErrorToast('Event name is required.', 'Event name is required.');
    if (!form.eventDate || !form.startTime || !form.endTime) return showErrorToast('Event date, start time, and end time are required.');
    if (form.endTime <= form.startTime) return showErrorToast('End time must be after start time.');
    setSaving(true);
    try {
      const payload = { ...form, maxAttendees: form.maxAttendees === '' ? null : Number(form.maxAttendees) };
      if (mode === 'edit' && event?.id) await eventsService.updateEvent(event.id, payload);
      else await eventsService.createEvent(payload);
      onSaved();
    } catch (err) {
      showErrorToast(err, mode === 'edit' ? 'Unable to update event.' : 'Unable to create event.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title={mode === 'edit' ? 'Edit Event' : 'Create Event'}
      subtitle="Add a church service, program, meeting, or special event."
      onClose={onClose}
      className="max-w-4xl"
    >
      <form className="space-y-6" onSubmit={submit}>
        <section className="space-y-4">
          <h4 className="text-sm font-semibold text-primary">Basic Info</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Event Name"><input className={inputClass} value={form.title} onChange={(event) => update('title', event.target.value)} placeholder="Sunday Service" /></FormField>
            <FormField label="Event Type"><select className={inputClass} value={form.eventType} onChange={(event) => update('eventType', event.target.value)}>{eventTypes.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></FormField>
            <div className="md:col-span-2"><FormField label="Short Description"><textarea className={inputClass} rows={2} value={form.description} onChange={(event) => update('description', event.target.value)} /></FormField></div>
          </div>
        </section>
        <section className="space-y-4">
          <h4 className="text-sm font-semibold text-primary">Schedule</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Event Date"><input className={inputClass} type="date" value={form.eventDate} onChange={(event) => update('eventDate', event.target.value)} /></FormField>
            <FormField label="Start Time"><input className={inputClass} type="time" value={form.startTime} onChange={(event) => update('startTime', event.target.value)} /></FormField>
            <FormField label="End Time"><input className={inputClass} type="time" value={form.endTime} onChange={(event) => update('endTime', event.target.value)} /></FormField>
          </div>
        </section>
        <section className="space-y-4">
          <h4 className="text-sm font-semibold text-primary">Location</h4>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField label="Location Type"><select className={inputClass} value={form.locationType} onChange={(event) => update('locationType', event.target.value)}><option value="PHYSICAL">Physical</option><option value="ONLINE">Online</option><option value="HYBRID">Hybrid</option></select></FormField>
            {form.locationType !== 'ONLINE' ? <FormField label="Physical Venue"><input className={inputClass} value={form.physicalLocation} onChange={(event) => update('physicalLocation', event.target.value)} /></FormField> : null}
            {form.locationType !== 'PHYSICAL' ? <FormField label="Online Link"><input className={inputClass} value={form.onlineLink} onChange={(event) => update('onlineLink', event.target.value)} placeholder="https://..." /></FormField> : null}
          </div>
        </section>
        <section className="space-y-4">
          <h4 className="text-sm font-semibold text-primary">Organizer</h4>
          <FormField label="Organizer"><input className={inputClass} value={form.organizerName} onChange={(event) => update('organizerName', event.target.value)} /></FormField>
        </section>
        <section className="space-y-4">
          <h4 className="text-sm font-semibold text-primary">Simple Settings</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary"><input type="checkbox" checked={form.isPublic} onChange={(event) => update('isPublic', event.target.checked)} /> Public to members?</label>
            <label className="flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary"><input type="checkbox" checked={form.registrationRequired} onChange={(event) => update('registrationRequired', event.target.checked)} /> Registration required?</label>
          </div>
        </section>
        <section className="space-y-4">
          <button type="button" className={secondaryButton} onClick={() => setAdvancedOpen((value) => !value)}>{advancedOpen ? 'Hide' : 'Show'} Advanced Settings</button>
          {advancedOpen ? (
            <div className="grid gap-4 rounded-lg border border-border bg-surface p-4 md:grid-cols-2">
              <FormField label="Repeat Event"><select className={inputClass} value={form.repeatType} onChange={(event) => update('repeatType', event.target.value)}><option value="NONE">Does not repeat</option><option value="WEEKLY">Weekly</option><option value="MONTHLY">Monthly</option><option value="CUSTOM">Custom</option></select></FormField>
              <FormField label="Maximum Attendees"><input className={inputClass} type="number" min="0" value={form.maxAttendees} onChange={(event) => update('maxAttendees', event.target.value)} /></FormField>
              <FormField label="Department Responsible"><input className={inputClass} value={form.department} onChange={(event) => update('department', event.target.value)} /></FormField>
              <FormField label="Tags"><input className={inputClass} value={form.tags} onChange={(event) => update('tags', event.target.value)} placeholder="service, youth, outreach" /></FormField>
            </div>
          ) : null}
        </section>
        <ModalActions saving={saving} saveLabel={mode === 'edit' ? 'Save Event' : 'Create Event'} onClose={onClose} />
      </form>
    </Modal>
  );
}

function ModalActions({ saving, saveLabel, onClose }: { saving: boolean; saveLabel: string; onClose: () => void }) {
  return (
    <div className="flex justify-end gap-3 border-t border-border pt-4">
      <button type="button" onClick={onClose} className={secondaryButton}>Cancel</button>
      <button type="submit" disabled={saving} className={primaryButton}>{saving ? 'Saving...' : saveLabel}</button>
    </div>
  );
}
