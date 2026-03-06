import { type ButtonHTMLAttributes, forwardRef } from 'react';

import { SpinnerIcon } from './icons/SpinnerIcon';

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
      inline-flex items-center justify-center rounded-xl font-semibold
      transition-all duration-200 ease-out
      focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:cursor-not-allowed disabled:opacity-60
      active:scale-95
    `;

    const sizeStyles = {
      sm: `min-h-[36px] px-3.5 py-2 text-sm gap-1.5`,
      md: `min-h-[44px] px-5 py-2.5 text-base gap-2`,
      lg: `min-h-[52px] px-7 py-3.5 text-lg gap-2.5`,
    };

    const variantStyles = {
      primary: `
        bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md shadow-primary-500/25
        hover:from-primary-700 hover:to-primary-800 hover:shadow-lg hover:shadow-primary-500/35
        focus:ring-primary-500 focus:ring-offset-2
        dark:shadow-primary-900/50
      `,
      secondary: `
        bg-gradient-to-r from-slate-600 to-slate-700 text-white shadow-md shadow-slate-500/20
        hover:from-slate-700 hover:to-slate-800 hover:shadow-lg hover:shadow-slate-500/30
        focus:ring-slate-500 focus:ring-offset-2
        dark:from-slate-700 dark:to-slate-800
      `,
      outline: `
        border-2 border-slate-300 bg-white text-slate-900 shadow-sm
        hover:bg-slate-50 hover:border-slate-400 hover:shadow
        focus:ring-slate-500 focus:ring-offset-2
        dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700
      `,
      ghost: `
        bg-transparent text-slate-700 shadow-none
        hover:bg-slate-100 hover:text-slate-900
        focus:ring-slate-500 focus:ring-offset-2
        dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white
      `,
      danger: `
        bg-gradient-to-r from-red-600 to-red-700 text-white shadow-md shadow-red-500/25
        hover:from-red-700 hover:to-red-800 hover:shadow-lg hover:shadow-red-500/35
        focus:ring-red-500 focus:ring-offset-2
        dark:shadow-red-900/50
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
          <SpinnerIcon
            className={`
              mr-2
              h-4
              w-4
              animate-spin
            `}
          />
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = `Button`;
