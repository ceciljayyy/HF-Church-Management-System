'use client';

import { type FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('admin@church.test');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setNotice(null);

    try {
      if (!email.trim() || !password.trim()) {
        throw new Error('Please enter both email and password.');
      }

      localStorage.removeItem('church_cms_auth');
      localStorage.removeItem('church_cms_user');

      const response = await fetch('/api/v1/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });

      const text = await response.text();
      let payload: { success?: boolean; message?: string } | null = null;

      try {
        payload = text ? JSON.parse(text) : null;
      } catch {
        throw new Error('Invalid response from server.');
      }

      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Wrong email or password.');
      }

      setNotice({ type: 'success', message: 'Login successful. Opening dashboard...' });
      setTimeout(() => {
        router.replace('/dashboard');
        router.refresh();
      }, 350);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unable to login';
      setError(message);
      setNotice({ type: 'error', message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12">
      {notice ? (
        <div
          className={`fixed right-6 top-6 z-50 max-w-sm rounded-lg border px-4 py-3 text-sm shadow-glow ${
            notice.type === 'success'
              ? 'border-green/40 bg-green/10 text-green'
              : 'border-danger/40 bg-danger/10 text-danger'
          }`}
          role="status"
        >
          {notice.message}
        </div>
      ) : null}

      <div className="grid w-full max-w-6xl overflow-hidden rounded-[2rem] border border-border bg-surface shadow-glow lg:grid-cols-[1.2fr_0.8fr]">
        <section className="relative flex flex-col justify-between gap-10 overflow-hidden bg-gradient-to-br from-[#0f1411] to-[#08130d] p-10">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(163,255,61,0.12),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(24,210,110,0.10),transparent_22%)]" />

          <div className="relative z-10 max-w-xl space-y-6">
            <div className="inline-flex rounded-full border border-lime/30 bg-lime/10 px-4 py-2 text-xs font-semibold tracking-[0.24em] text-lime">
              CHURCH ADMIN SUITE
            </div>

            <h1 className="text-4xl font-semibold leading-tight text-primary md:text-6xl">
              Modern ministry operations in one secure platform.
            </h1>

            <p className="max-w-lg text-sm leading-6 text-secondary md:text-base">
              Manage members, families, groups, events, attendance, finance,
              reports, and admin controls with a premium dark dashboard built
              for real church administration.
            </p>
          </div>

          <div className="relative z-10 grid gap-4 sm:grid-cols-3">
            {['Members', 'Attendance', 'Finance'].map((item) => (
              <div key={item} className="rounded-2xl border border-border bg-card/80 p-4">
                <p className="text-xs uppercase tracking-[0.24em] text-secondary">
                  {item}
                </p>
                <p className="mt-2 text-2xl font-semibold text-primary">Live</p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex items-center justify-center bg-background p-8">
          <form
            onSubmit={onSubmit}
            className="w-full max-w-md rounded-[1.75rem] border border-border bg-card p-8 shadow-glow"
          >
            <div className="mb-8">
              <h2 className="text-2xl font-semibold text-primary">Sign in</h2>
              <p className="mt-2 text-sm text-secondary">
                Sign in with your church admin account.
              </p>
            </div>

            <div className="space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm text-secondary">Email</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  required
                  className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-primary outline-none transition placeholder:text-muted focus:border-lime"
                  placeholder="admin@church.test"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm text-secondary">Password</span>
                <div className="flex items-center rounded-2xl border border-border bg-surface pr-2 transition focus-within:border-lime">
                  <input
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    className="min-w-0 flex-1 bg-transparent px-4 py-3 text-primary outline-none placeholder:text-muted"
                    placeholder="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((current) => !current)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-secondary transition hover:bg-hover hover:text-primary"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>

            {error ? (
              <p className="mt-4 rounded-2xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
                {error}
              </p>
            ) : null}

            <button
              type="submit"
              disabled={loading}
              className="mt-6 w-full rounded-2xl bg-gradient-to-r from-lime to-green px-4 py-3 font-semibold text-darkGreen transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>

            <p className="mt-4 text-center text-xs text-muted">
              Demo: admin@church.test / Password123!
            </p>
          </form>
        </section>
      </div>
    </main>
  );
}
