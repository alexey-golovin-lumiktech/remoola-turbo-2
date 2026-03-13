import { cn } from '@remoola/ui';

import styles from './AlertBanner.module.css';

interface AlertBannerProps {
  message: string;
  /** Set when the banner is a live region (e.g. form validation). */
  role?: `alert`;
  className?: string;
}

/**
 * AlertBanner - Inline error/alert box for forms and modals.
 * Single source for a11y (role="alert") and dark mode styling.
 */
export function AlertBanner({ message, role, className = `` }: AlertBannerProps) {
  return (
    <div className={cn(styles.root, className)} {...(role === `alert` ? { role: `alert` as const } : {})}>
      <p className={styles.message}>{message}</p>
    </div>
  );
}
