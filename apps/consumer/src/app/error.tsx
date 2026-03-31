'use client';

import { useEffect } from 'react';

import { clientLogger } from '../lib/logger';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    clientLogger.error(`App error boundary triggered`, {
      digest: error.digest,
      message: error.message,
    });
  }, [error]);

  return (
    <main
      style={{
        minHeight: `100vh`,
        display: `grid`,
        placeItems: `center`,
        padding: `24px`,
        background: `#f8fafc`,
        color: `#0f172a`,
      }}
    >
      <section
        data-testid="consumer-app-error"
        style={{
          width: `100%`,
          maxWidth: `480px`,
          borderRadius: `16px`,
          border: `1px solid #e2e8f0`,
          background: `#ffffff`,
          padding: `32px`,
          boxShadow: `0 20px 45px rgba(15, 23, 42, 0.08)`,
          textAlign: `center`,
        }}
      >
        <h2 style={{ margin: `0 0 12px`, fontSize: `1.5rem`, lineHeight: 1.2 }}>Something went wrong</h2>
        <p style={{ margin: `0 0 20px`, color: `#475569`, lineHeight: 1.5 }}>
          We hit an unexpected issue while loading this page. Please try again.
        </p>
        <button
          type="button"
          onClick={reset}
          data-testid="consumer-app-error-retry"
          style={{
            minWidth: `140px`,
            border: `none`,
            borderRadius: `10px`,
            padding: `12px 16px`,
            background: `#2563eb`,
            color: `#ffffff`,
            fontSize: `0.95rem`,
            fontWeight: 600,
            cursor: `pointer`,
          }}
        >
          Try again
        </button>
      </section>
    </main>
  );
}
