import './globals.css';
import { type Metadata, type Viewport } from 'next';
import { Inter } from 'next/font/google';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-sans',
});

export const metadata: Metadata = {
  title: `Remoola Admin v2`,
  description: `Operational admin console with canonical MVP-2 shell framing across core ops, top-level breadth, later admin breadth, and nested finance investigation routes`,
};

export const viewport: Viewport = {
  width: `device-width`,
  initialScale: 1,
  maximumScale: 5,
  viewportFit: `cover`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans">{children}</body>
    </html>
  );
}
