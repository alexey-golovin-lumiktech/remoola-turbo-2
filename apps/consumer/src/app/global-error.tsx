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
      <body>
        <div style={{ padding: `2rem`, fontFamily: `system-ui`, textAlign: `center` }}>
          <h2 style={{ marginBottom: `1rem` }}>Something went wrong</h2>
          <p style={{ marginBottom: `1.5rem`, color: `#666` }}>An unexpected error occurred. Please try again.</p>
          <button
            type="button"
            onClick={() => reset()}
            style={{
              padding: `0.5rem 1rem`,
              fontSize: `1rem`,
              cursor: `pointer`,
              backgroundColor: `#2563eb`,
              color: `white`,
              border: `none`,
              borderRadius: `0.375rem`,
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
