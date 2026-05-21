'use client';

import { useRouter } from 'next/navigation';

export function ErrorBoundaryUI({
  onReset,
  navigateTo,
  navigateLabel,
  description,
  minHeight = `min-h-screen`,
}: {
  onReset: () => void;
  navigateTo: string;
  navigateLabel: string;
  description: string;
  minHeight?: string;
}) {
  const router = useRouter();

  return (
    <div className={`flex ${minHeight} items-center justify-center px-4`}>
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 text-center">
        <h2 className="text-xl font-semibold text-white/90">Something went wrong</h2>
        <p className="mt-2 text-sm text-white/50">{description}</p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onReset}
            className="rounded-xl bg-white/10 px-4 py-2 text-sm font-medium text-white/80 transition hover:bg-white/15"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => router.push(navigateTo)}
            className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500"
          >
            {navigateLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
