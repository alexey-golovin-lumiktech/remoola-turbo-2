'use client';

import { useEffect, useLayoutEffect } from 'react';

import { ErrorState } from '../components/ui/ErrorState';
import { clientLogger } from '../lib/logger';

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

function applyStoredTheme() {
  try {
    const storageKey = `remoola-theme`;
    const stored = localStorage.getItem(storageKey);
    const theme = stored === `light` || stored === `dark` || stored === `system` ? stored : `system`;
    const resolved =
      theme === `system` ? (window.matchMedia(`(prefers-color-scheme: dark)`).matches ? `dark` : `light`) : theme;
    const root = document.documentElement;
    const body = document.body;

    root.classList.remove(`light`, `dark`);
    root.classList.add(resolved);
    root.dataset.theme = resolved;
    root.style.colorScheme = resolved;

    if (body) {
      body.classList.remove(`light`, `dark`);
      body.classList.add(resolved);
      body.dataset.theme = resolved;
      body.style.colorScheme = resolved;
    }
  } catch {
    // Ignore theme bootstrap failures and keep default rendering.
  }
}

/**
 * Root-level error UI. Replaces the root layout when triggered.
 * Must define its own <html> and <body> (Next.js requirement).
 * Defining this file also avoids Turbopack chunk load failures for the built-in global-error.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useLayoutEffect(() => {
    applyStoredTheme();
  }, []);

  useEffect(() => {
    clientLogger.error(`Global error boundary triggered`, {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <html lang="en" suppressHydrationWarning>
      <body style={{ margin: 0 }} suppressHydrationWarning>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <ErrorState
          title="Something went wrong"
          message="An unexpected error occurred. Please try again."
          onRetry={reset}
          retryTestId="consumer-global-error-retry"
        />
      </body>
    </html>
  );
}
