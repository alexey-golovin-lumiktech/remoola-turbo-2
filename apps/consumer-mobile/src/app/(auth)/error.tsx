'use client';

export default function AuthError({ reset }: { reset: () => void }) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-6">
      <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Authentication error</h2>
      <button type="button" onClick={reset} className="rounded-lg bg-blue-600 px-4 py-2 text-white">
        Try again
      </button>
    </div>
  );
}
