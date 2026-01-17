import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: `Remoola Admin`,
  description: `Remoola Admin Panel`,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
