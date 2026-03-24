import '@remoola/ui/styles.css';
import 'react-datepicker/dist/react-datepicker.css';
import 'react-phone-number-input/style.css';
import './globals.css';
import { type Metadata } from 'next';
import { Toaster } from 'sonner';

import { PageErrorBoundary, SWRProvider, ThemeProvider, ThemeInitializer } from '../components';

export const metadata: Metadata = {
  title: `Remoola`,
  description: `Client dashboard`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <ThemeProvider>
          <ThemeInitializer />
          <Toaster richColors position="top-right" />
          <SWRProvider>
            <PageErrorBoundary>{children}</PageErrorBoundary>
          </SWRProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
