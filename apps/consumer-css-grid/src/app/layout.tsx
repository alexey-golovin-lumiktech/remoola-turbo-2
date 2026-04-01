import '@remoola/ui/styles.css';
import 'react-phone-number-input/style.css';
import './globals.css';
import { type Metadata, type Viewport } from 'next';
import { cookies } from 'next/headers';

import { THEME } from '@remoola/api-types';

import { getSettings } from '../lib/consumer-api.server';
import { buildThemeScript, parseThemePreference } from '../lib/theme';
import { ThemeProvider } from '../shared/theme/ThemeProvider';

export const metadata: Metadata = {
  title: `Remoola`,
  description: `Consumer CSS Grid`,
};

export const viewport: Viewport = {
  width: `device-width`,
  initialScale: 1,
  maximumScale: 5,
  viewportFit: `cover`,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const settings = await getSettings();
  const cookieTheme = parseThemePreference(cookieStore.get(`remoola-theme`)?.value);
  const initialTheme = cookieTheme ?? parseThemePreference(settings?.theme) ?? THEME.SYSTEM;
  const themeScript = buildThemeScript(initialTheme);

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
      </body>
    </html>
  );
}
