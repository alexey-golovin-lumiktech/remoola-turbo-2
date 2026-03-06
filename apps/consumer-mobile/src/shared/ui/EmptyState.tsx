import { type ReactNode } from 'react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    href?: string;
    onClick?: () => void;
  };
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="animate-fadeIn flex min-h-[400px] flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-gradient-to-br from-slate-50/50 to-white px-6 py-16 text-center shadow-sm dark:border-slate-700 dark:from-slate-800/30 dark:to-slate-900/30">
      {icon && (
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-100 to-primary-50 text-primary-500 shadow-lg shadow-primary-100/50 dark:from-primary-900/40 dark:to-primary-800/30 dark:text-primary-400 dark:shadow-primary-900/20">
          {icon}
        </div>
      )}
      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
      {description && (
        <p className="mt-3 max-w-md text-base leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
      )}
      {action && (
        <div className="mt-8">
          {action.href ? (
            <a
              href={action.href}
              className="group inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary-200 transition-all hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-300 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:shadow-primary-900/40"
            >
              {action.label}
              <svg
                className="h-5 w-5 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          ) : (
            <button
              onClick={action.onClick}
              className="group inline-flex min-h-[48px] items-center gap-2 rounded-xl bg-primary-600 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-primary-200 transition-all hover:bg-primary-700 hover:shadow-xl hover:shadow-primary-300 hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:shadow-primary-900/40"
            >
              {action.label}
              <svg
                className="h-5 w-5 transition-transform group-hover:translate-x-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
