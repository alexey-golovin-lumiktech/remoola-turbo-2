import '@remoola/ui/styles.css';
import './globals.css';
import { Toaster } from 'sonner';

import { PerformanceProvider } from '../components/PerformanceProvider';
import { SWRProvider } from '../components/SWRProvider';
import { ThemeProvider } from '../components/ThemeProvider';
import { reportWebVitals } from '../lib/performance';

import type { Metadata } from 'next';

// Web Vitals reporting for Next.js
export { reportWebVitals };

export const metadata: Metadata = {
  title: `Remoola Admin`,
  description: `Remoola Admin Panel`,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <Toaster richColors position="top-right" />
          <PerformanceProvider>
            <SWRProvider>{children}</SWRProvider>
          </PerformanceProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
