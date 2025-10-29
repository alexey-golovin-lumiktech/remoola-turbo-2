import '@remoola/ui/styles.css';
import './globals.css';
import { UserProvider } from '../context/UserContext';

export const metadata = { title: `Remoola Admin`, description: `Admin CMS` };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <UserProvider>
        <body>{children}</body>
      </UserProvider>
    </html>
  );
}
