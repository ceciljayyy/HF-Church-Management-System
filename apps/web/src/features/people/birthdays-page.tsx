'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Cake, CheckSquare, Copy, MessageSquare, Phone, RotateCcw, Search, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/empty-state';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { Skeleton } from '@/components/ui/skeleton';
import { apiClient } from '@/lib/api-client';
import { showErrorToast, showSuccessToast, showWarningToast } from '@/lib/toast';

type BirthdayPerson = {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string | null;
  whatsappNumber?: string | null;
  dateOfBirth: string;
  birthdayLabel: string;
  month: number;
  day: number;
  age: number;
  isToday: boolean;
  departmentName?: string | null;
  preferredCommunicationChannel: 'SMS' | 'WHATSAPP' | 'BOTH' | 'NONE';
  canReceiveSms: boolean;
  canReceiveWhatsApp: boolean;
  doNotContact: boolean;
  allowSms: boolean;
  allowBirthdaySms: boolean;
};

type BirthdayGroup = {
  month: number;
  monthNumber: number;
  monthName: string;
  count: number;
  celebrants: BirthdayPerson[];
};

const months = [
  ['1', 'January'],
  ['2', 'February'],
  ['3', 'March'],
  ['4', 'April'],
  ['5', 'May'],
  ['6', 'June'],
  ['7', 'July'],
  ['8', 'August'],
  ['9', 'September'],
  ['10', 'October'],
  ['11', 'November'],
  ['12', 'December'],
] as const;

const defaultMessage = 'Happy birthday, {firstName}! God bless you and increase you on every side. From {churchName}.';

export function BirthdaysPageClient() {
  const currentMonth = new Date().getMonth() + 1;
  const [filter, setFilter] = useState<'today' | 'thisWeek' | 'thisMonth' | 'all'>('thisMonth');
  const [search, setSearch] = useState('');
  const [month, setMonth] = useState('');
  const [channel, setChannel] = useState('any');
  const [people, setPeople] = useState<BirthdayPerson[]>([]);
  const [groups, setGroups] = useState<BirthdayGroup[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendOpen, setSendOpen] = useState(false);
  const [markOpen, setMarkOpen] = useState(false);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set('filter', filter);
    if (filter === 'all') params.set('grouped', 'true');
    if (search) params.set('search', search);
    if (month) params.set('month', month);
    if (channel && channel !== 'any') params.set('channel', channel);
    return params.toString();
  }, [channel, filter, month, search]);

  useEffect(() => {
    let mounted = true;
    async function loadBirthdays() {
      setLoading(true);
      try {
        const payload = await apiClient.request<{ data?: BirthdayPerson[] | BirthdayGroup[]; months?: BirthdayGroup[] }>(`/people/birthdays?${query}`);
        if (!mounted) return;
        if (filter === 'all') {
          const nextGroups = payload.months ?? (payload.data as BirthdayGroup[]) ?? [];
          setGroups(nextGroups);
          setPeople(nextGroups.flatMap((group) => group.celebrants));
        } else {
          const nextPeople = (payload.data as BirthdayPerson[]) ?? [];
          setPeople(nextPeople);
          setGroups([]);
        }
        setSelectedIds([]);
      } catch (err) {
        if (mounted) {
          setPeople([]);
          setGroups([]);
          showErrorToast(err, 'Unable to load birthday celebrants.');
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadBirthdays();
    return () => {
      mounted = false;
    };
  }, [filter, query]);

  const selectedPeople = people.filter((person) => selectedIds.includes(person.id));
  const smsReadyCount = selectedPeople.filter((person) => person.canReceiveSms).length;
  const todayCount = people.filter((person) => person.isToday).length;
  const thisWeekCount = people.filter((person) => daysFromNow(person) <= 7).length;
  const thisMonthCount = people.filter((person) => person.month === currentMonth).length;
  const smsCount = people.filter((person) => person.canReceiveSms).length;

  function toggleSelected(id: string) {
    setSelectedIds((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]));
  }

  function toggleAllVisible() {
    const ids = people.map((person) => person.id);
    const allSelected = ids.length > 0 && ids.every((id) => selectedIds.includes(id));
    setSelectedIds(allSelected ? [] : ids);
  }

  function resetFilters() {
    setFilter('thisMonth');
    setSearch('');
    setMonth('');
    setChannel('any');
  }

  async function copyPhones() {
    const phones = selectedPeople.map((person) => person.phone).filter(Boolean).join(', ');
    if (!phones) {
      showWarningToast('Selected celebrants do not have phone numbers.');
      return;
    }
    await navigator.clipboard.writeText(phones);
    showSuccessToast('Phone numbers copied.');
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Birthdays"
        subtitle="View birthday celebrants, filter by date, and send birthday wishes."
        actions={<Link href="/settings?tab=communications" className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-primary transition hover:bg-hover">Message Settings</Link>}
      />

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="grid gap-3 xl:grid-cols-[auto_minmax(12rem,1fr)_12rem_12rem_auto]">
          <div className="flex flex-wrap gap-2">
            {[
              ['today', 'Today'],
              ['thisWeek', 'This Week'],
              ['thisMonth', 'This Month'],
              ['all', 'All Months'],
            ].map(([value, label]) => (
              <button key={value} type="button" onClick={() => setFilter(value as typeof filter)} className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${filter === value ? 'bg-lime text-darkGreen' : 'border border-border bg-surface text-secondary hover:bg-hover hover:text-primary'}`}>
                {label}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-secondary">
            <Search className="h-4 w-4" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search name or phone" className="min-w-0 flex-1 bg-transparent text-primary outline-none placeholder:text-muted" />
          </label>
          <select value={month} onChange={(event) => setMonth(event.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none">
            <option value="">All months</option>
            {months.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <select value={channel} onChange={(event) => setChannel(event.target.value)} className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-primary outline-none">
            <option value="any">Any channel</option>
            <option value="sms">SMS ready</option>
            <option value="whatsapp">WhatsApp ready</option>
            <option value="both">Both</option>
          </select>
          <button type="button" onClick={resetFilters} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-secondary transition hover:bg-hover hover:text-primary">
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Summary label="Birthdays Today" value={todayCount} />
        <Summary label="This Week" value={thisWeekCount} />
        <Summary label="This Month" value={thisMonthCount} />
        <Summary label="Contactable by SMS" value={smsCount} />
      </section>

      {selectedIds.length ? (
        <section className="sticky top-4 z-20 flex flex-col gap-3 rounded-lg border border-lime/40 bg-lime/10 px-4 py-3 text-sm shadow-glow sm:flex-row sm:items-center sm:justify-between">
          <span className="font-semibold text-primary">{selectedIds.length} selected</span>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setSendOpen(true)} className="inline-flex items-center gap-2 rounded-lg bg-lime px-3 py-2 font-semibold text-darkGreen"><Send className="h-4 w-4" />Send Birthday Wish</button>
            <button type="button" onClick={() => setMarkOpen(true)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-primary"><CheckSquare className="h-4 w-4" />Mark as Contacted</button>
            <button type="button" onClick={copyPhones} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-primary"><Copy className="h-4 w-4" />Copy Phone Numbers</button>
            <button type="button" onClick={() => setSelectedIds([])} className="rounded-lg border border-border bg-card px-3 py-2 text-secondary">Clear</button>
          </div>
        </section>
      ) : null}

      {loading ? (
        <BirthdaySkeleton />
      ) : filter === 'all' ? (
        <div className="space-y-5">
          {groups.map((group) => (
            <BirthdayMonthSection
              key={group.monthNumber}
              group={group}
              currentMonth={currentMonth}
              selectedIds={selectedIds}
              onToggle={toggleSelected}
            />
          ))}
        </div>
      ) : people.length ? (
        <section className="rounded-lg border border-border bg-card">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
            <div>
              <h2 className="text-base font-semibold text-primary">{filter === 'today' ? "Today's Birthday Celebrants" : 'Birthday Celebrants'}</h2>
              <p className="text-sm text-secondary">{people.length} celebrants found</p>
            </div>
            <label className="flex items-center gap-2 text-sm text-secondary">
              <input type="checkbox" checked={people.length > 0 && people.every((person) => selectedIds.includes(person.id))} onChange={toggleAllVisible} className="h-4 w-4 accent-lime" />
              Select all visible
            </label>
          </div>
          <div className="divide-y divide-border">
            {people.map((person) => <BirthdayRow key={person.id} person={person} checked={selectedIds.includes(person.id)} onToggle={() => toggleSelected(person.id)} />)}
          </div>
        </section>
      ) : (
        <EmptyState title={filter === 'today' ? 'No birthday celebrants today.' : 'No birthday celebrants found'} description="Add dates of birth and communication preferences to People records to show celebrants here." />
      )}

      <SendBirthdayModal open={sendOpen} people={selectedPeople} smsReadyCount={smsReadyCount} onClose={() => setSendOpen(false)} onDone={() => setSelectedIds([])} />
      <MarkContactedModal open={markOpen} people={selectedPeople} onClose={() => setMarkOpen(false)} onDone={() => setSelectedIds([])} />
    </div>
  );
}

function daysFromNow(person: BirthdayPerson) {
  const today = new Date();
  const birthday = new Date(Date.UTC(today.getUTCFullYear(), person.month - 1, person.day));
  if (birthday.getTime() < Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) birthday.setUTCFullYear(today.getUTCFullYear() + 1);
  return Math.round((birthday.getTime() - Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) / 86_400_000);
}

function Summary({ label, value }: { label: string; value: number }) {
  return <div className="rounded-lg border border-border bg-card px-4 py-3"><p className="text-xs text-muted">{label}</p><p className="mt-1 text-2xl font-semibold text-primary">{value}</p></div>;
}

function BirthdayMonthSection({ group, currentMonth, selectedIds, onToggle }: { group: BirthdayGroup; currentMonth: number; selectedIds: string[]; onToggle: (id: string) => void }) {
  const isCurrent = group.monthNumber === currentMonth;
  return (
    <section className={`rounded-lg border p-4 ${isCurrent ? 'border-lime/60 bg-lime/5' : 'border-border bg-card'}`}>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-primary">{group.monthName}{isCurrent ? <Cake className="h-5 w-5 text-lime" /> : null}</h2>
          <p className="text-sm text-secondary">{group.count} celebrants</p>
        </div>
        {isCurrent ? <Badge className="border-lime/50 bg-lime/10 text-lime">Current month</Badge> : null}
      </div>
      {group.celebrants.length ? (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {group.celebrants.map((person) => <BirthdayRow key={person.id} person={person} checked={selectedIds.includes(person.id)} onToggle={() => onToggle(person.id)} />)}
        </div>
      ) : (
        <p className="rounded-lg border border-dashed border-border bg-surface/40 px-4 py-6 text-center text-sm text-secondary">No celebrants in {group.monthName}.</p>
      )}
    </section>
  );
}

function BirthdayRow({ person, checked, onToggle }: { person: BirthdayPerson; checked: boolean; onToggle: () => void }) {
  return (
    <article className="grid gap-3 bg-surface px-4 py-3 transition hover:bg-hover md:grid-cols-[2rem_minmax(10rem,1.3fr)_8rem_minmax(9rem,1fr)_9rem_8rem] md:items-center">
      <input aria-label={`Select ${person.fullName}`} type="checkbox" checked={checked} onChange={onToggle} className="h-4 w-4 accent-lime" />
      <div className="min-w-0">
        <p className="truncate font-semibold text-primary">{person.fullName}</p>
        <p className="text-xs text-secondary">{person.departmentName ?? 'No department'}</p>
      </div>
      <div className="text-sm text-secondary">{person.birthdayLabel} {person.age ? <span className="text-muted">Age {person.age}</span> : null}</div>
      <div className="space-y-1 text-sm text-secondary">
        <p className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-lime" />{person.phone ?? 'No phone'}</p>
        {person.whatsappNumber ? <p className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5 text-green" />{person.whatsappNumber}</p> : null}
      </div>
      <Badge>{person.preferredCommunicationChannel}</Badge>
      <div className="flex flex-wrap gap-2">
        {person.isToday ? <Badge className="border-lime/50 bg-lime/10 text-lime">Today</Badge> : null}
        <Badge className={person.canReceiveSms ? 'border-green/40 bg-green/10 text-green' : 'border-warning/40 bg-warning/10 text-warning'}>{person.canReceiveSms ? 'SMS ready' : 'SMS skipped'}</Badge>
      </div>
    </article>
  );
}

function SendBirthdayModal({ open, people, smsReadyCount, onClose, onDone }: { open: boolean; people: BirthdayPerson[]; smsReadyCount: number; onClose: () => void; onDone: () => void }) {
  const [message, setMessage] = useState(defaultMessage);
  const [sending, setSending] = useState(false);
  const skipped = people.length - smsReadyCount;

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!people.length) {
      showWarningToast('Select at least one celebrant.');
      return;
    }
    setSending(true);
    try {
      const result = await apiClient.request<{ sent: number; failed: number; skipped: number }>('/communications/sms/birthday', {
        method: 'POST',
        body: JSON.stringify({ personIds: people.map((person) => person.id), message }),
      });
      const failedText = result.failed ? ` ${result.failed} failed.` : '';
      const skippedText = result.skipped ? ` ${result.skipped} skipped.` : '';
      showSuccessToast(`Birthday wishes sent to ${result.sent} celebrants.${failedText}${skippedText}`);
      onDone();
      onClose();
    } catch (err) {
      showErrorToast(err, 'Unable to send birthday SMS. Please try again.');
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal open={open} title="Send Birthday Wish" subtitle="Send birthday wishes by SMS. WhatsApp support is prepared for a future provider." onClose={onClose}>
      <form className="space-y-4" onSubmit={send}>
        <label className="space-y-2 text-sm text-secondary">
          <span>Channel</span>
          <select className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none" defaultValue="SMS">
            <option value="SMS">SMS</option>
            <option value="WHATSAPP" disabled>WhatsApp - Coming Soon</option>
          </select>
        </label>
        <label className="space-y-2 text-sm text-secondary">
          <span>Message Template</span>
          <textarea className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none focus:border-lime" rows={4} value={message} onChange={(event) => setMessage(event.target.value)} />
        </label>
        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary">
          <p>Selected: {people.length}</p>
          <p>Ready to send: {smsReadyCount}</p>
          <p>Will be skipped: {skipped}</p>
        </div>
        <div className="flex justify-end gap-3 border-t border-border pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary">Cancel</button>
          <button type="submit" disabled={sending || !smsReadyCount} className="rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen disabled:opacity-60">{sending ? 'Sending...' : 'Send SMS'}</button>
        </div>
      </form>
    </Modal>
  );
}

function MarkContactedModal({ open, people, onClose, onDone }: { open: boolean; people: BirthdayPerson[]; onClose: () => void; onDone: () => void }) {
  const [channel, setChannel] = useState('MANUAL');
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    try {
      const result = await apiClient.request<{ count: number }>('/people/birthdays/mark-contacted', {
        method: 'POST',
        body: JSON.stringify({ personIds: people.map((person) => person.id), channel, note }),
      });
      showSuccessToast(`Marked ${result.count} birthday celebrants as contacted.`);
      onDone();
      onClose();
    } catch (err) {
      showErrorToast(err, 'Unable to mark celebrants as contacted.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={open} title="Mark as Contacted" subtitle={`${people.length} selected celebrants`} onClose={onClose}>
      <form className="space-y-4" onSubmit={submit}>
        <label className="space-y-2 text-sm text-secondary"><span>Channel</span><select className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none" value={channel} onChange={(event) => setChannel(event.target.value)}><option value="MANUAL">Manual</option><option value="CALL">Call</option><option value="SMS">SMS</option><option value="WHATSAPP">WhatsApp</option></select></label>
        <label className="space-y-2 text-sm text-secondary"><span>Note</span><textarea className="w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none" rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Called and wished happy birthday." /></label>
        <div className="flex justify-end gap-3 border-t border-border pt-4"><button type="button" onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary">Cancel</button><button type="submit" disabled={saving || !people.length} className="rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen disabled:opacity-60">{saving ? 'Saving...' : 'Mark Contacted'}</button></div>
      </form>
    </Modal>
  );
}

function BirthdaySkeleton() {
  return (
    <div className="space-y-3" aria-busy="true" aria-live="polite">
      <Skeleton className="h-14 w-full" />
      {Array.from({ length: 6 }).map((_, index) => <Skeleton key={index} className="h-20 w-full" />)}
    </div>
  );
}
