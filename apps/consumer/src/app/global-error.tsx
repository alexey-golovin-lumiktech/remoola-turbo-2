'use client';

import { useEffect, useLayoutEffect } from 'react';

import {
  applyThemeToDocument,
  buildThemeBootstrapScript,
  readPersistedThemePreference,
  resolveThemePreference,
  setThemeColorMeta,
} from '@remoola/ui';

import { ErrorState } from '../components/ui/ErrorState';
import { clientLogger } from '../lib/logger';

const themeInitScript = buildThemeBootstrapScript({
  defaultTheme: `system`,
  includeBody: true,
  includeThemeColor: true,
});

function applyStoredTheme() {
  try {
    const theme = readPersistedThemePreference({ fallbackTheme: `system` }) ?? `system`;
    const resolved = resolveThemePreference(theme, window.matchMedia(`(prefers-color-scheme: dark)`).matches);
    applyThemeToDocument(resolved, { includeBody: true, preference: theme });
    setThemeColorMeta(resolved);
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
