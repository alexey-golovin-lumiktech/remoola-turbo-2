'use client';

/**
 * Root-level error UI. Replaces the root layout when triggered.
 * Must define its own <html> and <body> (Next.js requirement).
 * Defining this file also avoids Turbopack chunk load failures for the built-in global-error.
 */
export default function GlobalError({
  /* eslint-disable-line */ error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: `100vh`,
          display: `grid`,
          placeItems: `center`,
          padding: `24px`,
          fontFamily: `system-ui, sans-serif`,
          background: `#f8fafc`,
          color: `#0f172a`,
        }}
      >
        <main
          style={{
            width: `100%`,
            maxWidth: `420px`,
            borderRadius: `16px`,
            border: `1px solid #e2e8f0`,
            background: `#ffffff`,
            padding: `32px`,
            boxShadow: `0 20px 45px rgba(15, 23, 42, 0.08)`,
            textAlign: `center`,
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: `48px`,
              height: `48px`,
              margin: `0 auto 16px`,
              borderRadius: `9999px`,
              background: `#dbeafe`,
              color: `#1d4ed8`,
              display: `grid`,
              placeItems: `center`,
              fontSize: `24px`,
              fontWeight: 700,
            }}
          >
            !
          </div>
          <h2 style={{ margin: `0 0 12px`, fontSize: `1.5rem`, lineHeight: 1.2 }}>Something went wrong</h2>
          <p style={{ margin: `0 0 20px`, color: `#475569`, lineHeight: 1.5 }}>
            An unexpected error occurred. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            data-testid="consumer-global-error-retry"
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
        </main>
      </body>
    </html>
  );
}
