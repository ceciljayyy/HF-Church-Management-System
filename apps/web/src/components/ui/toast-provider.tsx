'use client';

import { Toaster } from 'sonner';

export function ToastProvider() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        classNames: {
          toast: 'border border-border bg-card text-primary shadow-glow',
          success: 'border-green/40',
          error: 'border-danger/40',
          warning: 'border-warning/40',
          info: 'border-info/40',
        },
      }}
    />
  );
}
