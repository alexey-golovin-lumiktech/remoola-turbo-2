import '@remoola/ui/styles.css';
import './globals.css';
import { type Metadata } from 'next';

export const metadata: Metadata = { title: `Remoola`, description: `Client dashboard` };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
