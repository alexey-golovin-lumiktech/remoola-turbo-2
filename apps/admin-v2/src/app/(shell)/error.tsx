'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

type ShellErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ShellError({ error, reset }: ShellErrorProps) {
  const router = useRouter();

  useEffect(() => {
    console.error(`[ShellError]`, error.message, error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <h2 className="text-xl font-semibold text-white/90">Something went wrong</h2>
        <p className="mt-2 text-sm text-white/50">
          An unexpected error occurred. Please try again or return to the overview.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/15"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => router.push(`/overview`)}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            Go to Overview
          </button>
        </div>
      </div>
    </div>
  );
}
