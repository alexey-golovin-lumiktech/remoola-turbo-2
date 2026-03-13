import { type ReactNode } from 'react';

import { cn } from '@remoola/ui';

import { ArrowDownIcon } from './icons/ArrowDownIcon';
import { ArrowUpIcon } from './icons/ArrowUpIcon';
import styles from './StatCard.module.css';

interface StatCardProps {
  label: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: string;
    direction: `up` | `down` | `neutral`;
  };
  className?: string;
}

export function StatCard({ label, value, icon, trend, className }: StatCardProps) {
  return (
    <div className={cn(styles.root, className)}>
      <div className={styles.glow} />

      <div className={styles.inner}>
        <div className={styles.header}>
          <div className={styles.labelBlock}>
            <p className={styles.label}>{label}</p>
            <p className={styles.value}>{value}</p>
          </div>
          {icon ? <div className={styles.iconWrap}>{icon}</div> : null}
        </div>

        {trend ? (
          <div className={styles.trendRow}>
            {trend.direction === `up` ? <ArrowUpIcon className={styles.trendUp} strokeWidth={2.5} /> : null}
            {trend.direction === `down` ? <ArrowDownIcon className={styles.trendDown} strokeWidth={2.5} /> : null}
            <span
              className={
                trend.direction === `up`
                  ? styles.trendValueUp
                  : trend.direction === `down`
                    ? styles.trendValueDown
                    : styles.trendValueNeutral
              }
            >
              {trend.value}
            </span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
