import '@remoola/ui/styles.css';
import 'react-datepicker/dist/react-datepicker.css';
import 'react-phone-number-input/style.css';
import './globals.css';
import { type Metadata } from 'next';
import { Toaster } from 'sonner';

import { PageErrorBoundary, SWRProvider, ThemeProvider, ThemeInitializer } from '../components';

const themeInitScript = [
  `(function(){try{`,
  `var storageKey='remoola-theme';`,
  `var stored=localStorage.getItem(storageKey);`,
  `var theme=stored==='light'||stored==='dark'||stored==='system'?stored:'system';`,
  `var resolved=theme==='system'?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):theme;`,
  `var root=document.documentElement;`,
  `var body=document.body;`,
  `root.classList.remove('light','dark');`,
  `root.classList.add(resolved);`,
  `root.dataset.theme=resolved;`,
  `root.style.colorScheme=resolved;`,
  `if(body){`,
  `body.classList.remove('light','dark');`,
  `body.classList.add(resolved);`,
  `body.dataset.theme=resolved;`,
  `body.style.colorScheme=resolved;`,
  `}`,
  `}catch(e){}})();`,
].join(``);

export const metadata: Metadata = {
  title: `Remoola`,
  description: `Client dashboard`,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
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
