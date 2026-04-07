import '@remoola/ui/styles.css';
import 'react-datepicker/dist/react-datepicker.css';
import 'react-phone-number-input/style.css';
import './globals.css';
import { type Metadata } from 'next';
import { Toaster } from 'sonner';

import { buildThemeBootstrapScript } from '@remoola/ui';

import { ThemeProvider } from '../components/ThemeProvider';
import { PageErrorBoundary } from '../components/ui/ErrorBoundary';
import { SWRProvider } from '../components/ui/SWRProvider';

const themeInitScript = buildThemeBootstrapScript({
  defaultTheme: `system`,
  includeBody: true,
  includeThemeColor: true,
});

export const metadata: Metadata = {
  title: `Remoola`,
  description: `Client dashboard`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <Toaster richColors position="top-right" />
          <SWRProvider>
            <PageErrorBoundary>{children}</PageErrorBoundary>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
