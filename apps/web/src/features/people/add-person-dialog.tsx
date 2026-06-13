'use client';

import { FormEvent, useMemo, useState } from 'react';
import { Modal } from '@/components/ui/modal';
import { FormField } from '@/components/ui/form-field';
import { apiClient } from '@/lib/api-client';

const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none transition placeholder:text-muted focus:border-lime';
const sectionClass = 'rounded-lg border border-border bg-surface/60 p-4';
const classifications = ['Unassigned', 'Visitor', 'First Timer', 'Regular Attendee', 'Member', 'Leader', 'Pastor', 'Staff'];

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
};

type FormState = {
  title: string;
  firstName: string;
  middleName: string;
  lastName: string;
  suffix: string;
  gender: string;
  birthMonth: string;
  birthDay: string;
  birthYear: string;
  hideAge: boolean;
  familyRole: string;
  homePhone: string;
  mobilePhone: string;
  workPhone: string;
  email: string;
  otherEmail: string;
  facebook: string;
  x: string;
  linkedin: string;
  classification: string;
  membershipDate: string;
  friendDate: string;
  notes: string;
};

const initialForm: FormState = {
  title: '',
  firstName: '',
  middleName: '',
  lastName: '',
  suffix: '',
  gender: '',
  birthMonth: '',
  birthDay: '',
  birthYear: '',
  hideAge: false,
  familyRole: 'Unassigned',
  homePhone: '',
  mobilePhone: '',
  workPhone: '',
  email: '',
  otherEmail: '',
  facebook: '',
  x: '',
  linkedin: '',
  classification: 'Unassigned',
  membershipDate: '',
  friendDate: '',
  notes: '',
};

function emailValid(value: string) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function buildDate(month: string, day: string, year: string) {
  if (!month || !day || !year) return null;
  const numericMonth = String(Number(month)).padStart(2, '0');
  const numericDay = String(Number(day)).padStart(2, '0');
  return `${year}-${numericMonth}-${numericDay}`;
}

export function AddPersonDialog({ open, onClose, onCreated }: Props) {
  const [form, setForm] = useState<FormState>(initialForm);
  const [mode, setMode] = useState<'save' | 'another'>('save');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const months = useMemo(
    () => [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ],
    [],
  );

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError('First name and last name are required.');
      return;
    }

    if (!emailValid(form.email) || !emailValid(form.otherEmail)) {
      setError('Enter a valid email address or leave email fields blank.');
      return;
    }

    setSaving(true);
    try {
      await apiClient.request('/people', {
        method: 'POST',
        body: JSON.stringify({
          title: form.title,
          firstName: form.firstName,
          middleName: form.middleName,
          lastName: form.lastName,
          suffix: form.suffix,
          gender: form.gender || null,
          dateOfBirth: buildDate(form.birthMonth, form.birthDay, form.birthYear),
          hideAge: form.hideAge,
          familyId: null,
          familyRole: form.familyRole,
          homePhone: form.homePhone,
          mobilePhone: form.mobilePhone,
          workPhone: form.workPhone,
          email: form.email,
          otherEmail: form.otherEmail,
          facebook: form.facebook,
          x: form.x,
          linkedin: form.linkedin,
          classification: form.classification,
          membershipDate: form.membershipDate || null,
          friendDate: form.friendDate || null,
          notes: form.notes,
        }),
      });
      setSuccess('Person saved successfully.');
      setForm(initialForm);
      onCreated();
      if (mode === 'save') onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save person.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      open={open}
      title="Add New Person"
      subtitle="Add contact, family, and church membership details."
      onClose={onClose}
      className="max-w-5xl"
    >
      <form className="space-y-5" onSubmit={submit}>
        {error ? <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
        {success ? <div className="rounded-lg border border-green/40 bg-green/10 px-4 py-3 text-sm text-green">{success}</div> : null}

        <section className={sectionClass}>
          <h4 className="mb-4 text-sm font-semibold text-primary">Name & Identity</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Title"><input className={inputClass} placeholder="Mr., Mrs., Dr." value={form.title} onChange={(event) => update('title', event.target.value)} /></FormField>
            <FormField label="First Name"><input className={inputClass} required value={form.firstName} onChange={(event) => update('firstName', event.target.value)} /></FormField>
            <FormField label="Middle Name"><input className={inputClass} value={form.middleName} onChange={(event) => update('middleName', event.target.value)} /></FormField>
            <FormField label="Last Name"><input className={inputClass} required value={form.lastName} onChange={(event) => update('lastName', event.target.value)} /></FormField>
            <FormField label="Suffix"><input className={inputClass} placeholder="Jr., Sr." value={form.suffix} onChange={(event) => update('suffix', event.target.value)} /></FormField>
            <FormField label="Gender">
              <select className={inputClass} value={form.gender} onChange={(event) => update('gender', event.target.value)}>
                <option value="">Select gender</option>
                <option value="MALE">Male</option>
                <option value="FEMALE">Female</option>
                <option value="OTHER">Other</option>
                <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
              </select>
            </FormField>
          </div>
        </section>

        <section className={sectionClass}>
          <h4 className="mb-4 text-sm font-semibold text-primary">Birth & Family</h4>
          <div className="grid gap-4 md:grid-cols-4">
            <FormField label="Birth Month">
              <select className={inputClass} value={form.birthMonth} onChange={(event) => update('birthMonth', event.target.value)}>
                <option value="">Month</option>
                {months.map((month, index) => <option key={month} value={index + 1}>{month}</option>)}
              </select>
            </FormField>
            <FormField label="Day"><input className={inputClass} min="1" max="31" type="number" value={form.birthDay} onChange={(event) => update('birthDay', event.target.value)} /></FormField>
            <FormField label="Year"><input className={inputClass} min="1900" max="2100" type="number" value={form.birthYear} onChange={(event) => update('birthYear', event.target.value)} /></FormField>
            <FormField label="Family Role">
              <select className={inputClass} value={form.familyRole} onChange={(event) => update('familyRole', event.target.value)}>
                {['Unassigned', 'Head of Family', 'Spouse', 'Child', 'Relative', 'Other'].map((role) => <option key={role}>{role}</option>)}
              </select>
            </FormField>
            <label className="flex items-center gap-3 text-sm text-secondary md:col-span-4">
              <input type="checkbox" checked={form.hideAge} onChange={(event) => update('hideAge', event.target.checked)} />
              Hide age
            </label>
          </div>
        </section>

        <section className={sectionClass}>
          <h4 className="mb-4 text-sm font-semibold text-primary">Contact Information</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Home Phone"><input className={inputClass} value={form.homePhone} onChange={(event) => update('homePhone', event.target.value)} /></FormField>
            <FormField label="Mobile Phone"><input className={inputClass} value={form.mobilePhone} onChange={(event) => update('mobilePhone', event.target.value)} /></FormField>
            <FormField label="Work Phone"><input className={inputClass} value={form.workPhone} onChange={(event) => update('workPhone', event.target.value)} /></FormField>
            <FormField label="Email"><input className={inputClass} type="email" value={form.email} onChange={(event) => update('email', event.target.value)} /></FormField>
            <FormField label="Other Email"><input className={inputClass} type="email" value={form.otherEmail} onChange={(event) => update('otherEmail', event.target.value)} /></FormField>
          </div>
        </section>

        <section className={sectionClass}>
          <h4 className="mb-4 text-sm font-semibold text-primary">Social Media</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Facebook"><input className={inputClass} value={form.facebook} onChange={(event) => update('facebook', event.target.value)} /></FormField>
            <FormField label="X"><input className={inputClass} value={form.x} onChange={(event) => update('x', event.target.value)} /></FormField>
            <FormField label="LinkedIn"><input className={inputClass} value={form.linkedin} onChange={(event) => update('linkedin', event.target.value)} /></FormField>
          </div>
        </section>

        <section className={sectionClass}>
          <h4 className="mb-4 text-sm font-semibold text-primary">Church Membership</h4>
          <div className="grid gap-4 md:grid-cols-3">
            <FormField label="Classification">
              <select className={inputClass} value={form.classification} onChange={(event) => update('classification', event.target.value)}>
                {classifications.map((classification) => <option key={classification}>{classification}</option>)}
              </select>
            </FormField>
            <FormField label="Membership Date"><input className={inputClass} type="date" value={form.membershipDate} onChange={(event) => update('membershipDate', event.target.value)} /></FormField>
            <FormField label="Friend Date"><input className={inputClass} type="date" value={form.friendDate} onChange={(event) => update('friendDate', event.target.value)} /></FormField>
            <div className="md:col-span-3">
              <FormField label="Notes"><textarea className={inputClass} rows={3} value={form.notes} onChange={(event) => update('notes', event.target.value)} /></FormField>
            </div>
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-3 border-t border-border pt-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary transition hover:bg-hover hover:text-primary">Cancel</button>
          <button type="submit" onClick={() => setMode('another')} disabled={saving} className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-primary transition hover:bg-hover disabled:opacity-60">Save and Add Another</button>
          <button type="submit" onClick={() => setMode('save')} disabled={saving} className="rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen transition hover:bg-lime/90 disabled:opacity-60">{saving ? 'Saving...' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
