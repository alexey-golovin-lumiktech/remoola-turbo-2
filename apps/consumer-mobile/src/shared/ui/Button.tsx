import { type ButtonHTMLAttributes, forwardRef } from 'react';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: `primary` | `secondary` | `outline` | `ghost` | `danger`;
  size?: `sm` | `md` | `lg`;
  isLoading?: boolean;
}

/**
 * Button - Reusable button component with multiple variants
 * Follows mobile-first design with proper touch targets (min-height: 44px)
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = `primary`, size = `md`, isLoading = false, disabled, children, className = ``, ...props }, ref) => {
    const baseStyles = `
      inline-flex items-center justify-center rounded-lg font-semibold
      transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:cursor-not-allowed disabled:opacity-50
    `;

    const sizeStyles = {
      sm: `min-h-[36px] px-3 py-1.5 text-sm`,
      md: `min-h-[44px] px-4 py-2.5 text-base`,
      lg: `min-h-[52px] px-6 py-3 text-lg`,
    };

    const variantStyles = {
      primary: `
        bg-primary-600 text-white shadow-sm
        hover:bg-primary-700 hover:shadow-md
        focus:ring-primary-500
      `,
      secondary: `
        bg-slate-600 text-white shadow-sm
        hover:bg-slate-700 hover:shadow-md
        focus:ring-slate-500
      `,
      outline: `
        border-2 border-slate-300 bg-transparent text-slate-900
        hover:bg-slate-50 hover:border-slate-400
        focus:ring-slate-500
        dark:border-slate-600 dark:text-white dark:hover:bg-slate-800
      `,
      ghost: `
        bg-transparent text-slate-700
        hover:bg-slate-100
        focus:ring-slate-500
        dark:text-slate-300 dark:hover:bg-slate-800
      `,
      danger: `
        bg-red-600 text-white shadow-sm
        hover:bg-red-700 hover:shadow-md
        focus:ring-red-500
      `,
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading && (
          <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = `Button`;
