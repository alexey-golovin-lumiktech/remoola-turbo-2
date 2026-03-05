'use client';

import Link from 'next/link';

interface BackButtonProps {
  href: string;
  label?: string;
  className?: string;
}

/**
 * BackButton - Mobile-first back navigation button
 *
 * Features:
 * - 44px minimum touch target (iOS/Android guidelines)
 * - Clear visual affordance
 * - Accessible with ARIA labels
 * - Consistent styling across app
 *
 * @example
 * <BackButton href="/payments" label="Back to Payments" />
 * <BackButton href="/contacts" /> // Uses default "Back" label
 */
export function BackButton({ href, label = `Back`, className = `` }: BackButtonProps) {
  return (
    <Link
      href={href}
      className={
        `group inline-flex min-h-[44px] min-w-[44px] items-center gap-2 rounded-lg px-3 py-2 ` +
        `text-sm font-medium text-slate-600 transition-all hover:bg-slate-100 hover:text-slate-900 ` +
        `dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white ` +
        `active:scale-95 ${className}`
      }
      aria-label={label}
    >
      <svg
        className="h-5 w-5 transition-transform group-hover:-translate-x-0.5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        aria-hidden="true"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}
