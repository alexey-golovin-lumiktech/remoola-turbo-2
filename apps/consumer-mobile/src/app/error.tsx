'use client';

import { useEffect } from 'react';

export default function RootError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Log to error reporting in production; correlation id can be error.digest
  }, [error]);

  return (
    <div
      className={`
      flex
      min-h-[50vh]
      flex-col
      items-center
      justify-center
      gap-4
      px-6
    `}
    >
      <h2
        className={`
        text-lg
        font-semibold
        text-slate-800
        dark:text-slate-200
      `}
      >
        Something went wrong
      </h2>
      <p
        className={`
        text-center
        text-sm
        text-slate-600
        dark:text-slate-400
      `}
      >
        We encountered an unexpected error. You can try again.
      </p>
      <button
        type="button"
        onClick={reset}
        className={
          `min-h-[44px] min-w-[44px] rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white ` +
          `focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`
        }
      >
        Try again
      </button>
    </div>
  );
}
