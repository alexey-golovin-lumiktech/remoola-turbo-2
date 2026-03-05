import { type ReactNode } from 'react';

interface ErrorStateProps {
  title?: string;
  message?: string;
  icon?: ReactNode;
  onRetry?: () => void;
  retryLabel?: string;
  showRetry?: boolean;
}

/**
 * ErrorState - Reusable error display component with retry functionality
 * Used in error.tsx boundaries across the app
 * Mobile-first: 44px touch targets, clear messaging, dark mode support
 */
export function ErrorState({
  title = `Something went wrong`,
  message = `We encountered an error. Please try again.`,
  icon,
  onRetry,
  retryLabel = `Try again`,
  showRetry = true,
}: ErrorStateProps) {
  return (
    <div
      className="
        flex
        min-h-[400px]
        items-center
        justify-center
        px-6
        py-12
      "
    >
      <div
        className="
          max-w-md
          text-center
        "
      >
        <div
          className="
            mx-auto
            flex
            h-16
            w-16
            items-center
            justify-center
            rounded-full
            bg-red-100
            dark:bg-red-900/30
          "
        >
          {icon ?? (
            <svg
              className="
                h-8
                w-8
                text-red-600
                dark:text-red-400
              "
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          )}
        </div>

        <h2
          className="
            mt-4
            text-xl
            font-semibold
            text-slate-900
            dark:text-white
          "
        >
          {title}
        </h2>

        <p
          className="
            mt-2
            text-sm
            text-slate-600
            dark:text-slate-400
          "
        >
          {message}
        </p>

        {showRetry && onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="
              mt-6
              inline-flex
              min-h-[44px]
              items-center
              rounded-lg
              bg-primary-600
              px-6
              py-2.5
              text-sm
              font-semibold
              text-white
              shadow-sm
              transition-all
              hover:bg-primary-700
              hover:shadow-md
              focus:outline-none
              focus:ring-2
              focus:ring-primary-500
              focus:ring-offset-2
            "
          >
            {retryLabel}
          </button>
        )}
      </div>
    </div>
  );
}
