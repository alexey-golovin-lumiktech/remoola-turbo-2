import './globals.css';
import { type Metadata, type Viewport } from 'next';

export const metadata: Metadata = {
  title: `Remoola Admin v2`,
  description: `Operational admin console MVP-1b`,
};

export const viewport: Viewport = {
  width: `device-width`,
  initialScale: 1,
  maximumScale: 5,
  viewportFit: `cover`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
