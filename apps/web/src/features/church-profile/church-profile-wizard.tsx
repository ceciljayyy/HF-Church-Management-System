'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Building2,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Copy,
  Globe2,
  Languages,
  Loader2,
  MapPin,
  Phone,
  Save,
  Upload,
} from 'lucide-react';
import {
  type ChurchProfile,
  churchProfileService,
  emptyChurchProfile,
} from '@/lib/services/church-profile.service';

const inputClass =
  'w-full rounded-lg border border-border bg-surface px-3 py-2.5 text-sm text-primary outline-none transition placeholder:text-muted focus:border-lime';
const cardClass = 'rounded-lg border border-border bg-card p-5 shadow-glow';

const steps = [
  { label: 'Church Identity', icon: Building2 },
  { label: 'Contact Information', icon: Phone },
  { label: 'Location & Map', icon: MapPin },
  { label: 'Language & Localization', icon: Languages },
  { label: 'Defaults', icon: Clock },
  { label: 'Review & Finish', icon: Check },
];

const regions = ['Greater Accra', 'Ashanti', 'Central', 'Eastern', 'Western', 'Volta', 'Northern', 'Bono', 'Upper East', 'Upper West'];
const languages = ['English', 'French', 'Twi', 'Other'];
const timezones = ['Africa/Accra', 'UTC', 'America/New_York', 'Europe/London', 'Africa/Lagos'];
const currencies = ['GHS', 'USD', 'EUR', 'GBP', 'NGN'];
const dateFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'];
const serviceDays = ['Sunday', 'Saturday', 'Friday', 'Wednesday'];

type Toast = { type: 'success' | 'error'; message: string } | null;

export function ChurchProfileWizard({
  initialProfile,
  mode = 'onboarding',
}: {
  initialProfile?: Partial<ChurchProfile> | null;
  mode?: 'onboarding' | 'settings';
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<ChurchProfile>({
    ...emptyChurchProfile,
    ...(initialProfile ?? {}),
  });
  const [saving, setSaving] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const [toast, setToast] = useState<Toast>(null);

  const progress = Math.round(((step + 1) / steps.length) * 100);
  const title = mode === 'onboarding' ? 'Church Setup' : 'Church Profile';
  const subtitle =
    mode === 'onboarding'
      ? 'Set up your church information used across reports, receipts, attendance, finance, and communication.'
      : 'Home / Admin / Church Information';

  function showToast(next: Toast) {
    setToast(next);
    window.setTimeout(() => setToast(null), 3600);
  }

  function update<K extends keyof ChurchProfile>(key: K, value: ChurchProfile[K]) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  function validateCurrentStep() {
    return validateStep(step);
  }

  function validateStep(stepIndex: number) {
    if (stepIndex === 0 && !profile.churchName.trim()) return 'Church name is required.';
    if (stepIndex === 0 && profile.website && !/^https?:\/\/.+\..+/.test(String(profile.website))) return 'Website must be valid if entered.';
    if (stepIndex === 1 && (!profile.phone.trim() || !profile.email.trim() || !profile.adminContactName.trim() || !profile.adminContactPhone.trim())) {
      return 'Please complete required fields.';
    }
    if (stepIndex === 1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(profile.email)) return 'Email must be valid.';
    if (stepIndex === 2) {
      if (!profile.city.trim() || !profile.country.trim()) return 'Please complete required fields.';
      const lat = profile.latitude === '' || profile.latitude === null ? null : Number(profile.latitude);
      const lng = profile.longitude === '' || profile.longitude === null ? null : Number(profile.longitude);
      if (lat !== null && (!Number.isFinite(lat) || lat < -90 || lat > 90)) return 'Latitude must be between -90 and 90.';
      if (lng !== null && (!Number.isFinite(lng) || lng < -180 || lng > 180)) return 'Longitude must be between -180 and 180.';
    }
    if (stepIndex === 3 && (!profile.language || !profile.timezone || !profile.currency)) return 'Please complete required fields.';
    if (stepIndex === 4 && (Number(profile.welfareInitialPayment) < 0 || Number(profile.welfareMonthlyPayment) < 0)) {
      return 'Welfare payment defaults must be 0 or greater.';
    }
    return null;
  }

  function validateAllSteps() {
    for (let index = 0; index < steps.length - 1; index += 1) {
      const error = validateStep(index);
      if (error) {
        setStep(index);
        return error;
      }
    }
    return null;
  }

  function nextStep() {
    const error = validateAllSteps();
    if (error) {
      showToast({ type: 'error', message: error });
      return;
    }
    setStep((current) => Math.min(current + 1, steps.length - 1));
  }

  async function detectCoordinates() {
    setDetecting(true);
    try {
      const result = await churchProfileService.geocodeChurchAddress({
        streetAddress: profile.streetAddress,
        city: profile.city,
        stateOrRegion: profile.stateOrRegion,
        postalCode: profile.postalCode,
        country: profile.country,
      });
      update('latitude', result.latitude);
      update('longitude', result.longitude);
      update('mapProvider', result.provider);
      showToast({ type: 'success', message: 'Coordinates detected successfully.' });
    } catch {
      showToast({ type: 'error', message: 'Unable to detect coordinates.' });
    } finally {
      setDetecting(false);
    }
  }

  async function save() {
    const error = validateCurrentStep();
    if (error) {
      showToast({ type: 'error', message: error });
      return;
    }
    setSaving(true);
    try {
      if (mode === 'onboarding') {
        await churchProfileService.completeChurchOnboarding(profile);
        showToast({ type: 'success', message: 'Church setup completed successfully.' });
        window.setTimeout(() => router.replace('/dashboard'), 500);
      } else {
        await churchProfileService.updateChurchProfile(profile);
        showToast({ type: 'success', message: 'Church profile updated successfully.' });
        router.refresh();
      }
    } catch {
      showToast({ type: 'error', message: 'Unable to save church information.' });
    } finally {
      setSaving(false);
    }
  }

  const previewAddress = useMemo(
    () => [profile.streetAddress, profile.city, profile.stateOrRegion, profile.postalCode, profile.country].filter(Boolean).join(', '),
    [profile],
  );
  const hasCoordinates = profile.latitude !== '' && profile.longitude !== '' && profile.latitude !== null && profile.longitude !== null;

  return (
    <div className="min-h-screen bg-background px-4 py-6 text-primary sm:px-6 lg:px-8">
      <ToastMessage toast={toast} />
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col gap-5 rounded-lg border border-border bg-surface/90 p-5 shadow-glow lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-lime text-lg font-black text-darkGreen">
              C
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-lime">Church Management System</p>
              <h1 className="mt-1 text-2xl font-semibold text-primary">{title}</h1>
              <p className="mt-1 max-w-3xl text-sm leading-6 text-secondary">{subtitle}</p>
            </div>
          </div>
          <div className="min-w-56">
            <div className="mb-2 flex items-center justify-between text-xs text-secondary">
              <span>Setup progress</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 rounded-full bg-hover">
              <div className="h-2 rounded-full bg-lime transition-all" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </header>

        <Stepper current={step} onSelect={setStep} />

        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <section className={cardClass}>
            {step === 0 ? <IdentityStep profile={profile} update={update} /> : null}
            {step === 1 ? <ContactStep profile={profile} update={update} /> : null}
            {step === 2 ? <LocationStep profile={profile} update={update} detectCoordinates={detectCoordinates} detecting={detecting} /> : null}
            {step === 3 ? <LocalizationStep profile={profile} update={update} /> : null}
            {step === 4 ? <DefaultsStep profile={profile} update={update} /> : null}
            {step === 5 ? <ReviewStep profile={profile} address={previewAddress} /> : null}

            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:justify-between">
              <button
                type="button"
                onClick={() => (step === 0 ? router.back() : setStep((current) => current - 1))}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-surface px-4 py-3 text-sm font-semibold text-secondary transition hover:bg-hover hover:text-primary"
              >
                <ChevronLeft className="h-4 w-4" />
                {step === 0 ? 'Cancel' : 'Back'}
              </button>
              {step < steps.length - 1 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen transition hover:brightness-110"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={save}
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-lime px-4 py-3 text-sm font-semibold text-darkGreen transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {mode === 'onboarding' ? 'Complete Setup' : 'Save Church Information'}
                </button>
              )}
            </div>
          </section>

          <aside className="space-y-6">
            <PreviewCard profile={profile} address={previewAddress} />
            <MapPreview profile={profile} hasCoordinates={hasCoordinates} />
          </aside>
        </div>
      </div>
    </div>
  );
}

export function ChurchProfileSkeleton() {
  return (
    <div className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="skeleton-shimmer h-32 rounded-lg" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-6">{steps.map((item) => <div key={item.label} className="skeleton-shimmer h-16 rounded-lg" />)}</div>
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
          <div className="skeleton-shimmer h-[32rem] rounded-lg" />
          <div className="space-y-6">
            <div className="skeleton-shimmer h-64 rounded-lg" />
            <div className="skeleton-shimmer h-72 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Stepper({ current, onSelect }: { current: number; onSelect: (step: number) => void }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border bg-card p-3">
      <div className="grid min-w-[52rem] grid-cols-6 gap-2">
        {steps.map(({ label, icon: Icon }, index) => {
          const done = index < current;
          const active = index === current;
          return (
            <button
              key={label}
              type="button"
              onClick={() => onSelect(index)}
              className={`flex items-center gap-2 rounded-lg px-3 py-3 text-left text-xs transition ${
                active || done ? 'bg-lime text-darkGreen' : 'bg-surface text-secondary hover:bg-hover hover:text-primary'
              }`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-background/15 font-semibold">
                {done ? <Check className="h-4 w-4" /> : index + 1}
              </span>
              <Icon className="h-4 w-4 shrink-0" />
              <span className="truncate font-semibold">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }: { icon: typeof Building2; title: string; subtitle?: string }) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-lime/30 bg-lime/10 text-lime">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-primary">{title}</h2>
        {subtitle ? <p className="mt-1 text-sm text-secondary">{subtitle}</p> : null}
      </div>
    </div>
  );
}

function Field({ label, required, children, helper }: { label: string; required?: boolean; children: React.ReactNode; helper?: string }) {
  return (
    <label className="block space-y-2 text-sm text-secondary">
      <span>
        {label} {required ? <span className="text-lime">*</span> : null}
      </span>
      {children}
      {helper ? <span className="block text-xs leading-5 text-muted">{helper}</span> : null}
    </label>
  );
}

function IdentityStep({ profile, update }: StepProps) {
  return (
    <>
      <SectionTitle icon={Building2} title="Church Identity" subtitle="Core identity used on reports, communication, receipts, and the dashboard." />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Church Name" required helper="Used on all reports and communications."><input className={inputClass} value={profile.churchName} onChange={(e) => update('churchName', e.target.value)} /></Field>
        <Field label="Branch Name"><input className={inputClass} value={profile.branchName ?? ''} onChange={(e) => update('branchName', e.target.value)} /></Field>
        <Field label="Denomination"><input className={inputClass} value={profile.denomination ?? ''} onChange={(e) => update('denomination', e.target.value)} /></Field>
        <Field label="Church Slogan"><input className={inputClass} value={profile.slogan ?? ''} onChange={(e) => update('slogan', e.target.value)} /></Field>
        <Field label="Website" helper="Optional. Use https://"><input className={inputClass} placeholder="https://" value={profile.website ?? ''} onChange={(e) => update('website', e.target.value)} /></Field>
        <Field label="Logo URL / Upload placeholder" helper="File storage is not configured yet; paste a logo URL or add storage later.">
          <div className="flex rounded-lg border border-dashed border-lime/30 bg-lime/5 p-3">
            <Upload className="mr-3 h-5 w-5 text-lime" />
            <input className="min-w-0 flex-1 bg-transparent text-sm text-primary outline-none placeholder:text-muted" placeholder="https://example.com/logo.png" value={profile.logoUrl ?? ''} onChange={(e) => update('logoUrl', e.target.value)} />
          </div>
        </Field>
      </div>
    </>
  );
}

function ContactStep({ profile, update }: StepProps) {
  return (
    <>
      <SectionTitle icon={Phone} title="Contact Information" />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Phone Number" required><input className={inputClass} value={profile.phone} onChange={(e) => update('phone', e.target.value)} /></Field>
        <Field label="Alternate Phone Number"><input className={inputClass} value={profile.alternatePhone ?? ''} onChange={(e) => update('alternatePhone', e.target.value)} /></Field>
        <Field label="Email Address" required><input type="email" className={inputClass} value={profile.email} onChange={(e) => update('email', e.target.value)} /></Field>
        <Field label="Senior Pastor Name"><input className={inputClass} value={profile.seniorPastorName ?? ''} onChange={(e) => update('seniorPastorName', e.target.value)} /></Field>
        <Field label="Admin Contact Name" required><input className={inputClass} value={profile.adminContactName} onChange={(e) => update('adminContactName', e.target.value)} /></Field>
        <Field label="Admin Contact Phone" required><input className={inputClass} value={profile.adminContactPhone} onChange={(e) => update('adminContactPhone', e.target.value)} /></Field>
        <Field label="Admin Contact Email"><input type="email" className={inputClass} value={profile.adminContactEmail ?? ''} onChange={(e) => update('adminContactEmail', e.target.value)} /></Field>
      </div>
    </>
  );
}

function LocationStep({ profile, update, detectCoordinates, detecting }: StepProps & { detectCoordinates: () => void; detecting: boolean }) {
  return (
    <>
      <SectionTitle icon={MapPin} title="Location" subtitle="Coordinates can be auto-detected after saving or entered manually. Manual values always take precedence." />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Street Address"><input className={inputClass} value={profile.streetAddress ?? ''} onChange={(e) => update('streetAddress', e.target.value)} /></Field>
        <Field label="City" required><input className={inputClass} value={profile.city} onChange={(e) => update('city', e.target.value)} /></Field>
        <Field label="State/Region"><select className={inputClass} value={profile.stateOrRegion ?? ''} onChange={(e) => update('stateOrRegion', e.target.value)}>{regions.map((region) => <option key={region}>{region}</option>)}</select></Field>
        <Field label="Postal Code"><input className={inputClass} value={profile.postalCode ?? ''} onChange={(e) => update('postalCode', e.target.value)} /></Field>
        <Field label="Country" required><input className={inputClass} value={profile.country} onChange={(e) => update('country', e.target.value)} /></Field>
      </div>
      <div className="mt-6 rounded-lg border border-border bg-surface p-4">
        <h3 className="mb-4 text-sm font-semibold text-primary">Map Coordinates</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Latitude"><input type="number" step="any" className={inputClass} value={profile.latitude ?? ''} onChange={(e) => update('latitude', e.target.value)} /></Field>
          <Field label="Longitude"><input type="number" step="any" className={inputClass} value={profile.longitude ?? ''} onChange={(e) => update('longitude', e.target.value)} /></Field>
        </div>
        <div className="mt-4 flex flex-wrap gap-3">
          <button type="button" onClick={detectCoordinates} disabled={detecting} className="inline-flex items-center gap-2 rounded-lg bg-lime px-4 py-2.5 text-sm font-semibold text-darkGreen disabled:opacity-60">
            {detecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
            Detect Coordinates from Address
          </button>
          <button type="button" onClick={() => { update('latitude', ''); update('longitude', ''); }} className="rounded-lg border border-border bg-card px-4 py-2.5 text-sm text-secondary">Clear Coordinates</button>
        </div>
      </div>
    </>
  );
}

function LocalizationStep({ profile, update }: StepProps) {
  return (
    <>
      <SectionTitle icon={Languages} title="Language & Localization" />
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Language" required><select className={inputClass} value={profile.language} onChange={(e) => update('language', e.target.value)}>{languages.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Time Zone" required><select className={inputClass} value={profile.timezone} onChange={(e) => update('timezone', e.target.value)}>{timezones.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Distance Unit"><select className={inputClass} value={profile.distanceUnit} onChange={(e) => update('distanceUnit', e.target.value)}><option value="kilometers">kilometers</option><option value="miles">miles</option></select></Field>
        <Field label="Currency" required><select className={inputClass} value={profile.currency} onChange={(e) => update('currency', e.target.value)}>{currencies.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Date Format"><select className={inputClass} value={profile.dateFormat} onChange={(e) => update('dateFormat', e.target.value)}>{dateFormats.map((item) => <option key={item}>{item}</option>)}</select></Field>
      </div>
    </>
  );
}

function DefaultsStep({ profile, update }: StepProps) {
  function copyAddress() {
    update('defaultCity', profile.city);
    update('defaultStateOrRegion', profile.stateOrRegion ?? '');
    update('defaultPostalCode', profile.postalCode ?? '');
    update('defaultCountry', profile.country);
  }
  return (
    <>
      <SectionTitle icon={Clock} title="Address Defaults" subtitle="These values will be pre-filled when creating people, members, departments, and event locations." />
      <button type="button" onClick={copyAddress} className="mb-4 inline-flex items-center gap-2 rounded-lg border border-lime/30 bg-lime/10 px-4 py-2.5 text-sm font-semibold text-lime">
        <Copy className="h-4 w-4" />
        Copy from church address
      </button>
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Default City"><input className={inputClass} value={profile.defaultCity ?? ''} onChange={(e) => update('defaultCity', e.target.value)} /></Field>
        <Field label="Default Region/State"><input className={inputClass} value={profile.defaultStateOrRegion ?? ''} onChange={(e) => update('defaultStateOrRegion', e.target.value)} /></Field>
        <Field label="Default Postal Code"><input className={inputClass} value={profile.defaultPostalCode ?? ''} onChange={(e) => update('defaultPostalCode', e.target.value)} /></Field>
        <Field label="Default Country"><input className={inputClass} value={profile.defaultCountry} onChange={(e) => update('defaultCountry', e.target.value)} /></Field>
        <Field label="Default Service Day"><select className={inputClass} value={profile.defaultServiceDay} onChange={(e) => update('defaultServiceDay', e.target.value)}>{serviceDays.map((item) => <option key={item}>{item}</option>)}</select></Field>
        <Field label="Default Service Time"><input type="time" className={inputClass} value={profile.defaultServiceTime} onChange={(e) => update('defaultServiceTime', e.target.value)} /></Field>
        <Toggle label="Enable Children Service Attendance" checked={profile.enableChildrenServiceAttendance} onChange={(value) => update('enableChildrenServiceAttendance', value)} />
        <Toggle label="Enable Vehicle Count" checked={profile.enableVehicleCount} onChange={(value) => update('enableVehicleCount', value)} />
        <Field label="Welfare Initial Payment"><input type="number" min="0" className={inputClass} value={profile.welfareInitialPayment} onChange={(e) => update('welfareInitialPayment', e.target.value)} /></Field>
        <Field label="Welfare Monthly Payment"><input type="number" min="0" className={inputClass} value={profile.welfareMonthlyPayment} onChange={(e) => update('welfareMonthlyPayment', e.target.value)} /></Field>
      </div>
    </>
  );
}

function ReviewStep({ profile, address }: { profile: ChurchProfile; address: string }) {
  return (
    <>
      <SectionTitle icon={Globe2} title="Display Preview" subtitle="Review how this information appears across reports, receipts, directories, dashboard, and login." />
      <PreviewCard profile={profile} address={address} large />
    </>
  );
}

function PreviewCard({ profile, address, large = false }: { profile: ChurchProfile; address: string; large?: boolean }) {
  return (
    <div className={`${cardClass} ${large ? 'shadow-none' : ''}`}>
      <p className="mb-4 text-xs uppercase tracking-[0.2em] text-lime">Display Preview</p>
      <div className="flex items-start gap-4">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-lime text-xl font-black text-darkGreen">
          {profile.logoUrl ? <img src={profile.logoUrl} alt="" className="h-full w-full object-cover" /> : (profile.churchName?.[0] ?? 'C')}
        </div>
        <div className="min-w-0">
          <h3 className="truncate text-lg font-semibold text-primary">{profile.churchName || 'Church Name'}</h3>
          <p className="text-sm text-secondary">{profile.branchName || 'Branch name'}</p>
          <p className="mt-3 text-sm leading-6 text-secondary">{address || 'Street, City, Region, Postal Code, Country'}</p>
          <div className="mt-3 space-y-1 text-sm text-secondary">
            <p>Phone: {profile.phone || '0242277563'}</p>
            <p>Email: {profile.email || 'info@hfmahiva.com'}</p>
            {profile.website ? <p>Website: {profile.website}</p> : null}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs text-muted">
            {['Reports', 'Receipts', 'Directories', 'Dashboard', 'Login page'].map((item) => <span key={item} className="rounded-lg border border-border bg-surface px-2 py-1">{item}</span>)}
          </div>
        </div>
      </div>
    </div>
  );
}

function MapPreview({ profile, hasCoordinates }: { profile: ChurchProfile; hasCoordinates: boolean }) {
  const lat = Number(profile.latitude);
  const lng = Number(profile.longitude);
  return (
    <div className={cardClass}>
      <p className="mb-4 text-xs uppercase tracking-[0.2em] text-lime">Map Preview</p>
      {hasCoordinates && Number.isFinite(lat) && Number.isFinite(lng) ? (
        <iframe
          title="Church map preview"
          className="h-72 w-full rounded-lg border border-border"
          src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
          loading="lazy"
        />
      ) : (
        <div className="flex h-72 items-center justify-center rounded-lg border border-dashed border-border bg-surface px-6 text-center text-sm leading-6 text-secondary">
          A map will appear here once coordinates are saved or auto-detected from your address.
        </div>
      )}
    </div>
  );
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex min-h-[4.35rem] items-center justify-between gap-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-secondary">
      <span>{label}</span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="h-4 w-4 accent-lime" />
    </label>
  );
}

function ToastMessage({ toast }: { toast: Toast }) {
  if (!toast) return null;
  return (
    <div
      className={`fixed right-4 top-4 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-glow ${
        toast.type === 'success' ? 'border-green/40 bg-green/10 text-green' : 'border-danger/40 bg-danger/10 text-danger'
      }`}
      role="status"
    >
      {toast.message}
    </div>
  );
}

type StepProps = {
  profile: ChurchProfile;
  update: <K extends keyof ChurchProfile>(key: K, value: ChurchProfile[K]) => void;
};
