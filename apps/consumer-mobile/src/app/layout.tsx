import '@remoola/ui/styles.css';
import 'react-day-picker/dist/style.css';
import 'react-phone-number-input/style.css';
import './globals.css';
import { type Metadata, type Viewport } from 'next';

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
  // theme-color is set by the blocking script and ThemeColorMeta from app theme (not system)
};

const THEME_SCRIPT = `
(function() {
  var key = 'remoola-theme';
  var stored = null;
  try { stored = localStorage.getItem(key); } catch (e) {}
  var theme = (stored === 'light' || stored === 'dark' || stored === 'system') ? stored : 'system';
  var resolved = theme === 'system'
    ? (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : theme;
  var root = document.documentElement;
  root.classList.remove('light', 'dark');
  root.classList.add(resolved);
  root.dataset.theme = resolved;
  var color = resolved === 'dark' ? '#0f172a' : '#f8fafc';
  function applyThemeColor() {
    var metas = document.querySelectorAll('meta[name="theme-color"]');
    for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', color);
    if (metas.length === 0) {
      var meta = document.createElement('meta');
      meta.name = 'theme-color';
      meta.setAttribute('content', color);
      document.head.appendChild(meta);
    }
  }
  applyThemeColor();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyThemeColor);
  }
})();
`.trim();

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
