import type { ReactNode } from 'react';
import { Toaster } from 'sonner';
import './globals.css';

export const metadata = {
  title: 'Church Management System',
  description: 'Premium church administration platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster
          richColors
          closeButton
          position="top-right"
          toastOptions={{
            style: {
              background: '#181C20',
              border: '1px solid #2A3036',
              color: '#F8FAFC',
              borderRadius: '0.75rem',
            },
          }}
        />
      </body>
    </html>
  );
}
