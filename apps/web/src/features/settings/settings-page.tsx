'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import { PageHeader } from '@/components/ui/page-header';

const inputClass = 'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none transition placeholder:text-muted focus:border-lime';
const menu = [
  'Account Centre',
  'Edit Profile',
  'Login and Security',
  'Notifications',
  'Appearance',
  'Language and Region',
  'Church Profile',
  'System Preferences',
  'Data and Privacy',
  'Logout',
];

function Toggle({ label, defaultChecked = true }: { label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary">
      <span>{label}</span>
      <input type="checkbox" defaultChecked={defaultChecked} className="h-4 w-4 accent-lime" />
    </label>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="space-y-2 text-sm text-secondary"><span>{label}</span>{children}</label>;
}

export function SettingsPageClient({ user }: { user: any }) {
  const router = useRouter();
  const [active, setActive] = useState(menu[0]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const profile = user?.profile ?? {};

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await apiClient.request('/settings', { method: 'POST', body: JSON.stringify({ key: `ui.${active}`, value: form, type: 'JSON' }) });
      setMessage('Settings saved successfully.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to save settings.');
    } finally {
      setSaving(false);
    }
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await apiClient.request('/settings/profile', {
        method: 'PATCH',
        body: JSON.stringify(form),
      });
      setMessage('Profile updated successfully.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to update profile.');
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');
    setSaving(true);
    const form = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await apiClient.request('/settings/change-password', {
        method: 'POST',
        body: JSON.stringify(form),
      });
      event.currentTarget.reset();
      setMessage('Password changed successfully.');
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to change password.');
    } finally {
      setSaving(false);
    }
  }

  async function logout() {
    try {
      await apiClient.logout();
    } catch {
      // Session may already be cleared.
    } finally {
      router.replace('/login');
      router.refresh();
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Settings" subtitle="Manage account, church profile, department, finance, attendance, privacy, and system preferences." />
      {message ? <div className="rounded-lg border border-green/40 bg-green/10 px-4 py-3 text-sm text-green">{message}</div> : null}
      {error ? <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">{error}</div> : null}
      <div className="grid gap-5 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="rounded-lg border border-border bg-card p-3">
          <nav className="space-y-1">
            {menu.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => item === 'Logout' ? logout() : setActive(item)}
                className={`w-full rounded-lg px-3 py-2.5 text-left text-sm transition ${active === item ? 'bg-lime font-semibold text-darkGreen' : 'text-secondary hover:bg-hover hover:text-primary'}`}
              >
                {item}
              </button>
            ))}
          </nav>
        </aside>

        <section className="rounded-lg border border-border bg-card p-5">
          {active === 'Account Centre' ? (
            <div className="space-y-5">
              <div className="flex flex-col gap-4 rounded-lg border border-border bg-surface p-4 sm:flex-row sm:items-center">
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-lime text-2xl font-black text-darkGreen">{user?.name?.[0] ?? 'U'}</div>
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-semibold text-primary">{user?.name ?? 'Current User'}</h3>
                  <p className="text-sm text-secondary">{user?.email ?? 'No email'}</p>
                  <p className="mt-1 text-xs text-muted">{(user?.roles ?? []).join(', ') || 'Active account'}</p>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <button type="button" onClick={() => setActive('Edit Profile')} className="rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen">Edit Profile</button>
                <button type="button" onClick={() => setActive('Login and Security')} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary">Change Password</button>
                <button type="button" onClick={logout} className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm font-semibold text-danger">Logout</button>
              </div>
            </div>
          ) : null}

          {active === 'Edit Profile' ? (
            <form className="space-y-4" onSubmit={saveProfile}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Full name"><input name="name" className={inputClass} defaultValue={user?.name ?? ''} /></Field>
                <Field label="Username"><input name="username" className={inputClass} defaultValue={profile?.username ?? user?.email?.split('@')[0] ?? ''} /></Field>
                <Field label="Email"><input name="email" type="email" className={inputClass} defaultValue={user?.email ?? ''} /></Field>
                <Field label="Phone number"><input name="phone" className={inputClass} defaultValue={profile?.phone ?? ''} /></Field>
                <Field label="Profile photo URL"><input name="profilePhotoUrl" className={inputClass} defaultValue={user?.avatarUrl ?? ''} /></Field>
                <Field label="Bio / note"><textarea name="bio" className={inputClass} rows={2} defaultValue={profile?.bio ?? ''} /></Field>
              </div>
              <SaveActions saving={saving} />
            </form>
          ) : null}

          {active === 'Login and Security' ? (
            <form className="space-y-4" onSubmit={changePassword}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Current password"><input name="currentPassword" type="password" className={inputClass} /></Field>
                <Field label="New password"><input name="newPassword" type="password" className={inputClass} /></Field>
                <Field label="Confirm new password"><input name="confirmPassword" type="password" className={inputClass} /></Field>
              </div>
              <Toggle label="Two-factor authentication placeholder" defaultChecked={false} />
              <p className="text-sm text-secondary">Active sessions and logout-all controls will use backend session records when enabled.</p>
              <SaveActions saving={saving} />
            </form>
          ) : null}

          {active === 'Notifications' ? <SettingsForm onSubmit={save} fields={['Email notifications', 'SMS notifications', 'WhatsApp notifications', 'In-app notifications', 'Finance alerts', 'Welfare reminders', 'Attendance reminders', 'Department updates']} /> : null}
          {active === 'Appearance' ? (
            <form className="space-y-4" onSubmit={save}>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Theme"><select name="theme" className={inputClass} defaultValue="dark"><option value="dark">Dark mode</option><option value="light">Light mode</option><option value="system">System default</option></select></Field>
                <Field label="Accent color"><input name="accentColor" className={inputClass} defaultValue="#A3FF3D" /></Field>
              </div>
              <Toggle label="Compact mode" defaultChecked={false} />
              <Toggle label="Sidebar collapsed by default" defaultChecked={false} />
              <SaveActions />
            </form>
          ) : null}
          {active === 'Language and Region' ? <RegionForm onSubmit={save} /> : null}
          {active === 'Church Profile' ? <ChurchForm onSubmit={save} /> : null}
          {active === 'System Preferences' ? <SystemPreferencesForm onSubmit={save} /> : null}
          {active === 'Data and Privacy' ? <Placeholder title="Data and Privacy" lines={['Export data placeholder', 'Backup database placeholder', 'Delete account placeholder', 'Privacy policy placeholder']} /> : null}
        </section>
      </div>
    </div>
  );
}

function SaveActions({ saving = false }: { saving?: boolean }) {
  return <div className="flex justify-end gap-3 border-t border-border pt-4"><button type="reset" className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary">Cancel</button><button type="submit" disabled={saving} className="rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving...' : 'Save Changes'}</button></div>;
}

function SettingsForm({ onSubmit, fields, extra }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void; fields: string[]; extra?: React.ReactNode }) {
  return <form className="space-y-4" onSubmit={onSubmit}>{fields.map((field) => <Toggle key={field} label={field} />)}{extra}<SaveActions /></form>;
}

function RegionForm({ onSubmit }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="space-y-4" onSubmit={onSubmit}><div className="grid gap-4 md:grid-cols-2"><Field label="Language"><input name="language" className={inputClass} defaultValue="English" /></Field><Field label="Country"><input name="country" className={inputClass} defaultValue="Ghana" /></Field><Field label="Time zone"><input name="timeZone" className={inputClass} defaultValue="Africa/Accra" /></Field><Field label="Currency"><input name="currency" className={inputClass} defaultValue="GHS" /></Field><Field label="Date format"><input name="dateFormat" className={inputClass} defaultValue="DD/MM/YYYY" /></Field></div><SaveActions /></form>;
}

function ChurchForm({ onSubmit }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="space-y-4" onSubmit={onSubmit}><div className="grid gap-4 md:grid-cols-2"><Field label="Church name"><input name="churchName" className={inputClass} /></Field><Field label="Branch name"><input name="branchName" className={inputClass} /></Field><Field label="Church email"><input name="churchEmail" className={inputClass} /></Field><Field label="Church phone"><input name="churchPhone" className={inputClass} /></Field><Field label="Address"><input name="address" className={inputClass} /></Field><Field label="City"><input name="city" className={inputClass} /></Field><Field label="Country"><input name="country" className={inputClass} defaultValue="Ghana" /></Field><Field label="Website"><input name="website" className={inputClass} /></Field></div><SaveActions /></form>;
}

function SystemPreferencesForm({ onSubmit }: { onSubmit: (event: FormEvent<HTMLFormElement>) => void }) {
  return <form className="space-y-4" onSubmit={onSubmit}><div className="grid gap-4 md:grid-cols-2"><Field label="Default currency"><input name="currency" className={inputClass} defaultValue="GHS" /></Field><Field label="Date format"><input name="dateFormat" className={inputClass} defaultValue="DD/MM/YYYY" /></Field><Field label="Vehicle types"><input name="vehicleTypes" className={inputClass} defaultValue="Cars, Bicycles, Motors/Motorbikes" /></Field><Field label="Default department role"><input name="defaultDepartmentRole" className={inputClass} defaultValue="Member" /></Field></div><Toggle label="Enable finance approvals" /><Toggle label="Enable receipts" /><Toggle label="Enable fund targets" /><Toggle label="Enable custom attendance sections" /><SaveActions /></form>;
}

function Placeholder({ title, lines }: { title: string; lines: string[] }) {
  return <div className="space-y-3"><h3 className="text-lg font-semibold text-primary">{title}</h3>{lines.map((line) => <p key={line} className="rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary">{line}</p>)}</div>;
}
