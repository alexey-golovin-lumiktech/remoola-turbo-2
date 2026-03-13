import { type ButtonHTMLAttributes, forwardRef } from 'react';

import { cn } from '@remoola/ui';

import styles from './Button.module.css';
import { SpinnerIcon } from './icons/SpinnerIcon';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: `primary` | `secondary` | `outline` | `ghost` | `danger`;
  size?: `sm` | `md` | `lg`;
  isLoading?: boolean;
}

const sizeClass = { sm: styles.sizeSm, md: styles.sizeMd, lg: styles.sizeLg } as const;
const variantClass = {
  primary: styles.variantPrimary,
  secondary: styles.variantSecondary,
  outline: styles.variantOutline,
  ghost: styles.variantGhost,
  danger: styles.variantDanger,
} as const;

/**
 * Button - Reusable button component with multiple variants
 * Follows mobile-first design with proper touch targets (min-height: 44px)
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = `primary`, size = `md`, isLoading = false, disabled, children, className = ``, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(styles.base, sizeClass[size], variantClass[variant], className)}
        {...props}
      >
        {isLoading ? <SpinnerIcon className={styles.spinner} /> : null}
        {children}
      </button>
    );
  },
);

Button.displayName = `Button`;
