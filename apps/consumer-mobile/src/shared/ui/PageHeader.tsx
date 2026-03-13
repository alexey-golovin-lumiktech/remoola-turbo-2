import { type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import styles from './PageHeader.module.css';

interface PageHeaderProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  badge?: ReactNode;
  className?: string;
}

export function PageHeader({ icon, title, subtitle, actions, badge, className = `` }: PageHeaderProps) {
  return (
    <div className={cn(styles.root, className)}>
      <div className={styles.inner}>
        <div className={styles.row}>
          <div className={styles.titleRow}>
            {icon}
            <div className={styles.titleBlock}>
              <div className={styles.badgeRow}>
                <h1 className={styles.title}>{title}</h1>
                {badge}
              </div>
              {subtitle ? <p className={styles.subtitle}>{subtitle}</p> : null}
            </div>
          </div>
          {actions ? <div className={styles.actions}>{actions}</div> : null}
        </div>
      </div>
    </div>
  );
}
