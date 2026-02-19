import { cn } from '@remoola/ui';

import styles from './ui/classNames.module.css';

// Base skeleton component
function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn(styles.adminSkeletonBase, className)} {...props} />;
}

// Table skeleton
export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className={styles.adminSkeletonTable}>
      {/* Header skeleton */}
      <div className={styles.adminSkeletonHeaderRow}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton key={i} className={styles.adminSkeletonHeaderCell} />
        ))}
      </div>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className={styles.adminSkeletonRow}>
          {Array.from({ length: columns }).map((_, colIndex) => (
            <Skeleton key={colIndex} className={styles.adminSkeletonRowCell} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Card skeleton
export function CardSkeleton() {
  return (
    <div className={styles.adminSkeletonCard}>
      <div className={styles.adminSkeletonCardBody}>
        <Skeleton className={styles.adminSkeletonLineThreeQuarters} />
        <Skeleton className={styles.adminSkeletonLineHalf} />
        <div className={styles.adminSkeletonTextGroup}>
          <Skeleton className={styles.adminSkeletonTextLine} />
          <Skeleton className={styles.adminSkeletonTextLineFourFifths} />
          <Skeleton className={styles.adminSkeletonTextLineTwoThirds} />
        </div>
      </div>
    </div>
  );
}

// Page header skeleton (used by PageSkeleton)
export function PageHeaderSkeleton() {
  return (
    <div className={styles.adminSkeletonPageHeader}>
      <div className={styles.adminSkeletonPageHeaderText}>
        <Skeleton className={styles.adminSkeletonPageTitle} />
        <Skeleton className={styles.adminSkeletonPageSubtitle} />
      </div>
      <Skeleton className={styles.adminSkeletonPageAction} />
    </div>
  );
}

// Full page skeleton
export function PageSkeleton() {
  return (
    <div className={styles.adminSkeletonPage}>
      <PageHeaderSkeleton />
      <CardSkeleton />
      <TableSkeleton />
    </div>
  );
}
