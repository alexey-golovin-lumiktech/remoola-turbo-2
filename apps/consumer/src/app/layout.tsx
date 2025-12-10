import '@remoola/ui/styles.css';
import './globals.css';
import { type Metadata } from 'next';
import { Toaster } from 'sonner';

export const metadata: Metadata = {
  title: `Remoola`,
  description: `Client dashboard`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Toaster richColors position="top-right" />
        {children}
      </body>
    </html>
  );
}
