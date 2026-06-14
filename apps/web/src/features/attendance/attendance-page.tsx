'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bike, Car, Heart, Plus, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { FormField } from '@/components/ui/form-field';
import { Modal } from '@/components/ui/modal';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { attendanceService } from '@/lib/services/attendance.service';

type Mode = 'overview' | 'main-service' | 'children-service' | 'vehicles' | 'sections' | 'history' | 'custom';

const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none transition placeholder:text-muted focus:border-lime';
const buttonClass = 'inline-flex items-center gap-2 rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen transition hover:bg-lime/90 disabled:opacity-60';
const secondaryButtonClass = 'rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary';
const dangerButtonClass = 'rounded-lg border border-danger/40 bg-danger/10 px-3 py-2 text-xs font-semibold text-danger transition hover:bg-danger/20';
const sectionTypes = ['SERVICE', 'CHILDREN', 'VEHICLE', 'PROGRAM', 'MINISTRY', 'DEPARTMENT', 'EVENT', 'OTHER'];
const fieldTypes = ['number', 'text', 'select', 'checkbox', 'date', 'time', 'textarea'];

const today = () => new Date().toISOString().slice(0, 10);

function number(value: unknown) {
  return Number(value ?? 0).toLocaleString();
}

function label(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (match) => match.toUpperCase());
}

function iconFor(section: any) {
  if (section?.slug === 'vehicles' || section?.type === 'VEHICLE') return <Car className="h-5 w-5" />;
  if (section?.slug === 'children-service' || section?.type === 'CHILDREN') return <Heart className="h-5 w-5" />;
  return <Users className="h-5 w-5" />;
}

export function AttendancePage({ mode, sectionId }: { mode: Mode; sectionId?: string }) {
  const router = useRouter();
  const [overview, setOverview] = useState<any>(null);
  const [sections, setSections] = useState<any[]>([]);
  const [history, setHistory] = useState<any[]>([]);
  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [recordSection, setRecordSection] = useState<any>(null);
  const [showSectionPicker, setShowSectionPicker] = useState(false);
  const [showBuilder, setShowBuilder] = useState(false);

  async function loadAttendance() {
    setError('');
    try {
      const [overviewData, sectionsData, historyData] = await Promise.all([
        attendanceService.getAttendanceOverview(),
        attendanceService.getAttendanceSections(),
        attendanceService.getAttendanceHistory(),
      ]);
      setOverview(overviewData);
      setSections(sectionsData.items ?? []);
      setHistory(historyData.items ?? []);
      if (mode === 'main-service') setDetail(await attendanceService.getMainServiceStats());
      if (mode === 'children-service') setDetail(await attendanceService.getChildrenServiceStats());
      if (mode === 'vehicles') setDetail(await attendanceService.getVehicleStats());
      if (mode === 'custom' && sectionId) setDetail(await attendanceService.getAttendanceSectionById(sectionId));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to load attendance data.');
    } finally {
      setLoading(false);
    }
  }

  async function afterSave(messageText: string) {
    setMessage(messageText);
    setRecordSection(null);
    setShowSectionPicker(false);
    setShowBuilder(false);
    await loadAttendance();
    router.refresh();
  }

  useEffect(() => {
    loadAttendance();
  }, [mode, sectionId]);

  const page = {
    overview: {
      title: 'Attendance',
      subtitle: 'Track main service, children service, vehicles, and custom attendance sections.',
      actions: (
        <>
          <button type="button" className={buttonClass} onClick={() => setShowSectionPicker(true)}><Plus className="h-4 w-4" />Record Attendance</button>
          <button type="button" className={secondaryButtonClass} onClick={() => setShowBuilder(true)}>Create Section</button>
          <Link href="/attendance/history" className={secondaryButtonClass}>View History</Link>
        </>
      ),
    },
    'main-service': { title: 'Main Service', subtitle: 'Track adult/main church service attendance.', actions: null },
    'children-service': { title: 'Children Service', subtitle: 'Track boys and girls attendance in children service.', actions: null },
    vehicles: { title: 'Vehicles', subtitle: 'Track cars, bicycles, and motors/motorbikes parked outside.', actions: null },
    sections: { title: 'Attendance Sections', subtitle: 'Create and manage custom attendance sections and fields.', actions: <button type="button" className={buttonClass} onClick={() => setShowBuilder(true)}><Plus className="h-4 w-4" />Create Section</button> },
    history: { title: 'Attendance History', subtitle: 'All attendance records from default and custom sections.', actions: <button type="button" className={buttonClass} onClick={() => setShowSectionPicker(true)}><Plus className="h-4 w-4" />Record Attendance</button> },
    custom: { title: detail?.section?.name ?? 'Attendance Section', subtitle: detail?.section?.description ?? 'Custom attendance section details.', actions: null },
  }[mode];

  if (loading) return <div className="rounded-lg border border-border bg-card p-6 text-sm text-secondary">Loading attendance data...</div>;

  return (
    <div className="space-y-6">
      <PageHeader title={page.title} subtitle={page.subtitle} actions={page.actions} />
      {error ? <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      {message ? <div className="rounded-lg border border-green/40 bg-green/10 px-4 py-3 text-sm text-green">{message}</div> : null}

      {mode === 'overview' ? <Overview overview={overview} sections={sections} onRecord={setRecordSection} /> : null}
      {mode === 'sections' ? <SectionsView sections={sections} /> : null}
      {mode === 'history' ? <HistoryTable records={history} /> : null}
      {['main-service', 'children-service', 'vehicles', 'custom'].includes(mode) && detail ? <DetailView detail={detail} onRecord={setRecordSection} /> : null}

      <SectionPicker open={showSectionPicker} sections={sections} onClose={() => setShowSectionPicker(false)} onPick={(section) => { setShowSectionPicker(false); setRecordSection(section); }} />
      <RecordAttendanceModal section={recordSection} onClose={() => setRecordSection(null)} onSaved={() => afterSave(`${recordSection?.name ?? 'Attendance'} recorded successfully.`)} />
      <CreateAttendanceSectionModal open={showBuilder} onClose={() => setShowBuilder(false)} onSaved={() => afterSave('Attendance section created successfully.')} />
    </div>
  );
}

function Overview({ overview, sections, onRecord }: { overview: any; sections: any[]; onRecord: (section: any) => void }) {
  const cards = [
    { href: '/attendance/main-service', label: 'Main Service Total Attendance', data: overview?.cards?.main, trend: 'Main Service' },
    { href: '/attendance/children-service', label: 'Children Service Total Attendance', data: overview?.cards?.children, trend: 'Children Service' },
    { href: '/attendance/vehicles', label: 'Vehicles Total Count', data: overview?.cards?.vehicles, trend: 'Vehicles' },
  ];
  return (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="rounded-lg border border-border bg-card p-5 shadow-glow transition hover:-translate-y-0.5 hover:bg-hover">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm text-secondary">{card.label}</p>
                <h3 className="mt-2 text-3xl font-semibold text-primary">{number(card.data?.latestTotal)}</h3>
                <p className="mt-2 text-xs text-muted">{card.data?.lastRecordedAt ? new Date(card.data.lastRecordedAt).toLocaleString() : 'No record yet'}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-lime/15 text-lime">{iconFor(card.data?.section)}</div>
            </div>
            <p className="mt-4 text-xs font-semibold text-lime">View Details</p>
          </Link>
        ))}
      </section>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Highest Attendance This Month" value={overview?.highestAttendanceThisMonth ?? 0} icon={<Users className="h-5 w-5" />} accent="green" />
        <StatCard label="Average Attendance This Month" value={overview?.averageAttendanceThisMonth ?? 0} icon={<Users className="h-5 w-5" />} accent="lime" />
        <StatCard label="Latest People Attendance" value={overview?.peopleAttendanceToday ?? 0} icon={<Users className="h-5 w-5" />} accent="info" />
        <StatCard label="Latest Vehicles Count" value={overview?.vehiclesToday ?? 0} icon={<Car className="h-5 w-5" />} accent="warning" />
      </section>
      <section className="grid gap-5 xl:grid-cols-2">
        <TrendCard title="Attendance Trend" data={overview?.trend ?? []} />
        <Panel title="Custom Attendance Sections">
          <div className="grid gap-3 sm:grid-cols-2">
            {sections.filter((section) => !section.isDefault).map((section) => (
              <Link key={section.id} href={`/attendance/sections/${section.id}`} className="rounded-lg border border-border bg-surface p-4 transition hover:bg-hover">
                <div className="flex items-center gap-3">
                  <div className="text-lime">{iconFor(section)}</div>
                  <div>
                    <p className="text-sm font-semibold text-primary">{section.name}</p>
                    <p className="text-xs text-secondary">{label(section.type)}</p>
                  </div>
                </div>
              </Link>
            ))}
            {!sections.filter((section) => !section.isDefault).length ? <p className="text-sm text-secondary">No custom sections yet.</p> : null}
          </div>
        </Panel>
      </section>
      <Panel title="Recent Attendance Records"><HistoryTable records={overview?.recentRecords ?? []} compact /></Panel>
      <Panel title="Quick Record">
        <div className="flex flex-wrap gap-3">
          {sections.map((section) => <button key={section.id} type="button" className={secondaryButtonClass} onClick={() => onRecord(section)}>{section.name}</button>)}
        </div>
      </Panel>
    </div>
  );
}

function DetailView({ detail, onRecord }: { detail: any; onRecord: (section: any) => void }) {
  const section = detail.section;
  const latest = detail.latest;
  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <button type="button" className={buttonClass} onClick={() => onRecord(section)}><Plus className="h-4 w-4" />Record {section.name} Attendance</button>
      </div>
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard label={`Latest ${section.name}`} value={detail.latestTotal ?? 0} icon={iconFor(section)} accent="green" />
        {section.fields.filter((field: any) => field.countTowardTotal).slice(0, 3).map((field: any) => <StatCard key={field.key} label={field.label} value={number(latest?.values?.[field.key])} icon={<Users className="h-5 w-5" />} accent="lime" />)}
        <StatCard label="Average" value={detail.average ?? 0} icon={<Users className="h-5 w-5" />} accent="info" />
        <StatCard label="Highest" value={detail.highest ?? 0} icon={<Users className="h-5 w-5" />} accent="warning" />
        <StatCard label="Lowest" value={detail.lowest ?? 0} icon={<Users className="h-5 w-5" />} accent="danger" />
      </section>
      <TrendCard title={`${section.name} Trend`} data={detail.trend ?? []} />
      <HistoryTable records={detail.records ?? []} />
    </div>
  );
}

function SectionsView({ sections }: { sections: any[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {sections.map((section) => (
        <Link key={section.id} href={section.isDefault ? `/attendance/${section.slug}` : `/attendance/sections/${section.id}`} className="rounded-lg border border-border bg-card p-5 transition hover:bg-hover">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-base font-semibold text-primary">{section.name}</h3>
              <p className="mt-1 text-sm text-secondary">{section.description}</p>
            </div>
            <Badge>{label(section.type)}</Badge>
          </div>
          <p className="mt-4 text-xs text-muted">{section.fields.length} fields</p>
        </Link>
      ))}
    </div>
  );
}

function TrendCard({ title, data }: { title: string; data: any[] }) {
  const max = Math.max(1, ...data.map((item) => Number(item.value ?? 0)));
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <h3 className="text-sm font-semibold text-primary">{title}</h3>
      <div className="mt-4 space-y-3">
        {data.map((item) => (
          <div key={item.name} className="grid grid-cols-[7rem_minmax(0,1fr)_4rem] items-center gap-3 text-sm">
            <span className="truncate text-secondary">{item.name}</span>
            <div className="h-2 rounded-full bg-surface"><div className="h-2 rounded-full bg-lime" style={{ width: `${(Number(item.value ?? 0) / max) * 100}%` }} /></div>
            <span className="text-right text-xs text-muted">{number(item.value)}</span>
          </div>
        ))}
        {!data.length ? <p className="text-sm text-secondary">No trend data yet.</p> : null}
      </div>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-lg border border-border bg-card p-5"><h3 className="mb-4 text-sm font-semibold text-primary">{title}</h3>{children}</div>;
}

function HistoryTable({ records, compact = false }: { records: any[]; compact?: boolean }) {
  const rows = records.map((record) => [
    new Date(record.attendanceDate).toLocaleDateString(),
    record.sectionName,
    record.serviceTitle,
    number(record.total),
    Object.entries(record.values ?? {}).map(([key, value]) => `${label(key)}: ${value}`).join(', '),
    compact ? null : record.recordedByName ?? '-',
    compact ? null : record.notes ?? '-',
    compact ? null : <button key={record.id} type="button" className={secondaryButtonClass}>View</button>,
  ].filter((cell) => cell !== null));
  return <DataTable columns={compact ? ['Date', 'Section', 'Service/Event Name', 'Total', 'Breakdown'] : ['Date', 'Section', 'Service/Event Name', 'Total', 'Breakdown', 'Recorded By', 'Notes', 'Actions']} rows={rows} minWidthClass={compact ? 'min-w-[840px]' : 'min-w-[1180px]'} />;
}

function SectionPicker({ open, sections, onPick, onClose }: { open: boolean; sections: any[]; onPick: (section: any) => void; onClose: () => void }) {
  return (
    <Modal open={open} title="Select Attendance Section" onClose={onClose}>
      <div className="grid gap-3">
        {sections.map((section) => <button key={section.id} type="button" className={secondaryButtonClass} onClick={() => onPick(section)}>{section.name}</button>)}
      </div>
    </Modal>
  );
}

function RecordAttendanceModal({ section, onClose, onSaved }: { section: any | null; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ serviceTitle: '', attendanceDate: today(), recordedByName: '', notes: '', values: {} as Record<string, any> });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!section) return;
    const values: Record<string, any> = {};
    section.fields.forEach((field: any) => { values[field.key] = field.defaultValue ?? (field.type === 'number' ? 0 : ''); });
    setForm({ serviceTitle: section.name, attendanceDate: today(), recordedByName: '', notes: '', values });
    setError('');
  }, [section]);
  const total = useMemo(() => section?.fields?.filter((field: any) => field.countTowardTotal).reduce((sum: number, field: any) => sum + Number(form.values[field.key] ?? 0), 0) ?? 0, [section, form.values]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!section) return;
    setError('');
    if (!form.attendanceDate) return setError('Service date is required.');
    for (const field of section.fields) {
      if (field.required && (form.values[field.key] === undefined || form.values[field.key] === '')) return setError(`${field.label} is required.`);
      if (field.type === 'number' && Number(form.values[field.key] ?? 0) < 0) return setError(`${field.label} must be 0 or higher.`);
    }
    setSaving(true);
    try {
      await attendanceService.createAttendanceRecord({ ...form, sectionId: section.id });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to record attendance.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal open={Boolean(section)} title={section ? `Record ${section.name} Attendance` : 'Record Attendance'} onClose={onClose} className="max-w-3xl">
      {error ? <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      <form className="mt-4 space-y-5" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Service date"><input className={inputClass} type="date" value={form.attendanceDate} onChange={(event) => setForm({ ...form, attendanceDate: event.target.value })} /></FormField>
          <FormField label="Service name/title"><input className={inputClass} value={form.serviceTitle} onChange={(event) => setForm({ ...form, serviceTitle: event.target.value })} /></FormField>
          {section?.fields.map((field: any) => <DynamicField key={field.key} field={field} value={form.values[field.key]} onChange={(value) => setForm({ ...form, values: { ...form.values, [field.key]: value } })} />)}
          <FormField label="Recorded by"><input className={inputClass} value={form.recordedByName} onChange={(event) => setForm({ ...form, recordedByName: event.target.value })} /></FormField>
          <FormField label="Notes"><textarea className={inputClass} rows={2} value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} /></FormField>
        </div>
        <div className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-primary">Calculated total: <span className="font-semibold text-lime">{number(total)}</span></div>
        <ModalActions saving={saving} saveLabel="Save Attendance" onClose={onClose} />
      </form>
    </Modal>
  );
}

function DynamicField({ field, value, onChange }: { field: any; value: any; onChange: (value: any) => void }) {
  if (field.type === 'textarea') return <FormField label={field.label}><textarea className={inputClass} rows={2} value={value ?? ''} onChange={(event) => onChange(event.target.value)} /></FormField>;
  if (field.type === 'checkbox') return <label className="flex items-center gap-3 pt-8 text-sm text-secondary"><input type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /> {field.label}</label>;
  if (field.type === 'select') return <FormField label={field.label}><select className={inputClass} value={value ?? ''} onChange={(event) => onChange(event.target.value)}>{(field.options ?? []).map((option: string) => <option key={option} value={option}>{option}</option>)}</select></FormField>;
  return <FormField label={field.label}><input className={inputClass} type={field.type === 'number' ? 'number' : field.type} min={field.type === 'number' ? 0 : undefined} value={value ?? ''} onChange={(event) => onChange(field.type === 'number' ? Number(event.target.value) : event.target.value)} /></FormField>;
}

function CreateAttendanceSectionModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ name: '', description: '', type: 'PROGRAM', icon: 'Users', status: 'ACTIVE' });
  const [fields, setFields] = useState<any[]>([{ id: 'field_1', label: 'Adults', key: 'adults', type: 'number', required: true, defaultValue: 0, helpText: '', countTowardTotal: true }]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.name.trim()) return setError('Section name is required.');
    if (!fields.length) return setError('At least one field is required.');
    setSaving(true);
    try {
      await attendanceService.createAttendanceSection({ ...form, fields });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to create attendance section.');
    } finally {
      setSaving(false);
    }
  }
  return (
    <Modal open={open} title="Create Attendance Section" onClose={onClose} className="max-w-4xl">
      {error ? <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      <form className="mt-4 space-y-5" onSubmit={submit}>
        <div className="grid gap-4 md:grid-cols-2">
          <FormField label="Section name"><input className={inputClass} value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} /></FormField>
          <FormField label="Section type"><select className={inputClass} value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })}>{sectionTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select></FormField>
          <FormField label="Icon"><input className={inputClass} value={form.icon} onChange={(event) => setForm({ ...form, icon: event.target.value })} /></FormField>
          <FormField label="Description"><input className={inputClass} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></FormField>
        </div>
        <Panel title="Custom Fields">
          <div className="space-y-3">
            {fields.map((field, index) => (
              <div key={field.id} className="grid gap-3 rounded-lg border border-border bg-surface p-3 md:grid-cols-[1fr_1fr_9rem_6rem_7rem_5rem]">
                <input className={inputClass} placeholder="Field label" value={field.label} onChange={(event) => setFields((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, label: event.target.value, key: item.key || event.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '_') } : item))} />
                <input className={inputClass} placeholder="Field key" value={field.key} onChange={(event) => setFields((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, key: event.target.value } : item))} />
                <select className={inputClass} value={field.type} onChange={(event) => setFields((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, type: event.target.value } : item))}>{fieldTypes.map((type) => <option key={type} value={type}>{label(type)}</option>)}</select>
                <label className="flex items-center gap-2 text-sm text-secondary"><input type="checkbox" checked={field.required} onChange={(event) => setFields((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, required: event.target.checked } : item))} /> Required</label>
                <label className="flex items-center gap-2 text-sm text-secondary"><input type="checkbox" checked={field.countTowardTotal} onChange={(event) => setFields((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, countTowardTotal: event.target.checked } : item))} /> Counts</label>
                <button type="button" className={dangerButtonClass} onClick={() => setFields((items) => items.filter((_, itemIndex) => itemIndex !== index))}>Remove</button>
              </div>
            ))}
            <button type="button" className={secondaryButtonClass} onClick={() => setFields((items) => [...items, { id: `field_${Date.now()}`, label: '', key: '', type: 'number', required: false, defaultValue: 0, helpText: '', countTowardTotal: true }])}>Add Field</button>
          </div>
        </Panel>
        <ModalActions saving={saving} saveLabel="Save Section" onClose={onClose} />
      </form>
    </Modal>
  );
}

function ModalActions({ saving, saveLabel, onClose }: { saving: boolean; saveLabel: string; onClose: () => void }) {
  return (
    <div className="flex justify-end gap-3 border-t border-border pt-4">
      <button type="button" onClick={onClose} className={secondaryButtonClass}>Cancel</button>
      <button type="submit" disabled={saving} className={buttonClass}>{saving ? 'Saving...' : saveLabel}</button>
    </div>
  );
}
