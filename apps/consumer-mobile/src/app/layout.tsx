import '@remoola/ui/styles.css';
import 'react-day-picker/dist/style.css';
import 'react-phone-number-input/style.css';
import './globals.css';
import { type Metadata, type Viewport } from 'next';

import { buildThemeBootstrapScript } from '@remoola/ui';

import { AppProviders } from '../shared/ui/AppProviders';

export const metadata: Metadata = {
  title: `Remoola`,
  description: `Consumer mobile`,
};

export const viewport: Viewport = {
  width: `device-width`,
  initialScale: 1,
  maximumScale: 5,
  viewportFit: `cover`,
  // theme-color is set by the blocking bootstrap script and runtime theme sync.
};

const THEME_SCRIPT = buildThemeBootstrapScript({
  defaultTheme: `system`,
  includeBody: true,
  includeThemeColor: true,
});

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }} />
      </head>
      <body suppressHydrationWarning>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
