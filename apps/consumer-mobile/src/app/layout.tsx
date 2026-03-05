import '@remoola/ui/styles.css';
import './globals.css';
import { type Metadata, type Viewport } from 'next';

import { AppProviders } from '../shared/ui';

export const metadata: Metadata = {
  title: `Remoola`,
  description: `Consumer mobile`,
};

export const viewport: Viewport = {
  width: `device-width`,
  initialScale: 1,
  maximumScale: 5,
  viewportFit: `cover`,
  themeColor: [
    { media: `(prefers-color-scheme: light)`, color: `#f8fafc` },
    { media: `(prefers-color-scheme: dark)`, color: `#0f172a` },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
