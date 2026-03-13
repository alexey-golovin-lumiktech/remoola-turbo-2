import { type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import styles from './FormCard.module.css';

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
    <div className={cn(styles.root, className)}>
      {title || description ? (
        <div className={styles.header}>
          {title ? <h3 className={styles.title}>{title}</h3> : null}
          {description ? <p className={styles.description}>{description}</p> : null}
        </div>
      ) : null}

      <div className={styles.body}>{children}</div>

      {footer ? <div className={styles.footer}>{footer}</div> : null}
    </div>
  );
}
