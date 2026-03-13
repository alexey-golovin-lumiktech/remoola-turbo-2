import { cn } from '@remoola/ui';

import styles from './SkeletonLoader.module.css';

export function SkeletonCard() {
  return (
    <div className={styles.card}>
      <div className={styles.cardLine1} />
      <div className={styles.cardLine2} />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.spaceY3}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={styles.listItem}>
          <div className={styles.listItemLine1} />
          <div className={styles.listItemLine2} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div className={styles.stat}>
      <div className={styles.statLabel} />
      <div className={styles.statValue} />
    </div>
  );
}

export function SkeletonText({ className }: { className?: string }) {
  return <div className={cn(styles.text, className)} />;
}

export function SkeletonForm() {
  return (
    <div className={styles.spaceY4}>
      <div>
        <div className={styles.formLabel} />
        <div className={styles.formField} />
      </div>
      <div>
        <div className={styles.formLabelW32} />
        <div className={styles.formField} />
      </div>
      <div>
        <div className={styles.formLabelW28} />
        <div className={styles.formFieldTall} />
      </div>
      <div className={styles.formButton} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className={styles.spaceY3}>
      <div className={styles.tableHeader}>
        <div className={styles.tableCell} />
        <div className={styles.tableCell} />
        <div className={styles.tableCell} />
        <div className={styles.tableCell} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={styles.tableRow}>
          <div className={styles.tableCell} />
          <div className={styles.tableCell} />
          <div className={styles.tableCell} />
          <div className={styles.tableCell} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPaymentCard() {
  return (
    <div className={styles.paymentCard}>
      <div className={styles.paymentCardRow}>
        <div className={styles.paymentCardContent}>
          <div className={styles.paymentCardLine1} />
          <div className={styles.paymentCardLine2} />
          <div className={styles.paymentCardLine3} />
        </div>
        <div className={styles.paymentCardBadge} />
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className={styles.dashboard}>
      <div className={styles.dashboardGrid}>
        <SkeletonStat />
        <SkeletonStat />
      </div>
      <div className={styles.spaceY3}>
        <div className={styles.dashboardTitle} />
        <SkeletonPaymentCard />
        <SkeletonPaymentCard />
        <SkeletonPaymentCard />
      </div>
    </div>
  );
}
