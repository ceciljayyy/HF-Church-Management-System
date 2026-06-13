'use client';

export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-3xl border border-border bg-card p-8 text-center">
      <h2 className="text-xl font-semibold text-primary">Something went wrong</h2>
      <p className="max-w-md text-sm text-secondary">{error.message}</p>
      <button onClick={reset} className="rounded-2xl bg-lime px-4 py-2 font-semibold text-darkGreen">
        Try again
      </button>
    </div>
  );
}