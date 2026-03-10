import { type ReactNode } from 'react';

interface FormCardProps {
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * FormCard - Container for form sections with optional title and footer
 * Provides consistent styling for form layouts
 */
export function FormCard({ title, description, children, footer, className = `` }: FormCardProps) {
  return (
    <div
      className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs dark:border-slate-700 dark:bg-slate-800 ${className}`}
    >
      {(title || description) && (
        <div
          className={`
          border-b
          border-slate-200
          bg-slate-50
          px-4
          py-4
          dark:border-slate-700
          dark:bg-slate-800/50
          sm:px-6
        `}
        >
          {title && (
            <h3
              className={`
            text-lg
            font-semibold
            text-slate-900
            dark:text-white
          `}
            >
              {title}
            </h3>
          )}
          {description && (
            <p
              className={`
            mt-1
            text-sm
            text-slate-600
            dark:text-slate-400
          `}
            >
              {description}
            </p>
          )}
        </div>
      )}

      <div className={`px-4 py-5 sm:px-6`}>{children}</div>

      {footer && (
        <div
          className={`
          border-t
          border-slate-200
          bg-slate-50
          px-4
          py-4
          dark:border-slate-700
          dark:bg-slate-800/50
          sm:px-6
        `}
        >
          {footer}
        </div>
      )}
    </div>
  );
}
