import Link from 'next/link';
import { type ReactNode } from 'react';

import styles from './EmptyState.module.css';
import { ArrowRightIcon } from './icons/ArrowRightIcon';

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
  const isInternalHref = (href: string) => href.startsWith(`/`) && !href.startsWith(`//`);

  return (
    <div className={styles.root}>
      {icon ? <div className={styles.iconWrap}>{icon}</div> : null}
      <h3 className={styles.title}>{title}</h3>
      {description ? <p className={styles.description}>{description}</p> : null}
      {action ? (
        <div className={styles.actionWrap}>
          {action.href ? (
            isInternalHref(action.href) ? (
              <Link href={action.href} className={styles.actionButton}>
                {action.label}
                <ArrowRightIcon className={styles.actionIcon} strokeWidth={2} />
              </Link>
            ) : (
              <a href={action.href} className={styles.actionButton}>
                {action.label}
                <ArrowRightIcon className={styles.actionIcon} strokeWidth={2} />
              </a>
            )
          ) : (
            <button type="button" onClick={action.onClick} className={styles.actionButton}>
              {action.label}
              <ArrowRightIcon className={styles.actionIcon} strokeWidth={2} />
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}
