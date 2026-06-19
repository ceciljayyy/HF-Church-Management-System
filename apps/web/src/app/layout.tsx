import type { ReactNode } from 'react';
import { ToastProvider } from '@/components/ui/toast-provider';
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
        <ToastProvider />
      </body>
    </html>
  );
}
