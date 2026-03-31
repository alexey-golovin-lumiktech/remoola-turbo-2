import { cn } from '@remoola/ui';

import shared from './classNames.module.css';
import lineStyles from './Skeleton.module.css';

const {
  actionRowGrid,
  dashboardContainer,
  dashboardGrid,
  skeletonBase,
  skeletonCard,
  skeletonCardPadding,
  skeletonCardTitle,
  skeletonCellShort,
  skeletonCellTiny,
  skeletonHeaderBlock,
  skeletonHeaderCell,
  skeletonHeaderTitle,
  skeletonLine,
  skeletonRow,
  skeletonSpaceY2,
  skeletonSpaceY3,
  skeletonSpaceY4,
  skeletonTableContainer,
  skeletonTablePadding,
  skeletonTextFiveSixths,
  skeletonTextFourSixths,
  summaryGrid,
} = shared;

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn(skeletonBase, className)} />;
}

export function SkeletonText({ className, lines = 1 }: SkeletonProps & { lines?: number }) {
  if (lines === 1) {
    return <Skeleton className={cn(skeletonLine, className)} />;
  }

  return (
    <div className={skeletonSpaceY2}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            lineStyles.lineHeight,
            i === lines - 1 ? lineStyles.lineWidthThreeQuarter : lineStyles.lineWidthFull,
            className,
          )}
        />
      ))}
    </div>
  );
}

export function SkeletonCard({ className }: SkeletonProps) {
  return (
    <div className={cn(skeletonCard, className)}>
      <div className={skeletonSpaceY4}>
        <Skeleton className={skeletonCardTitle} />
        <div className={skeletonSpaceY3}>
          <Skeleton className={skeletonLine} />
          <Skeleton className={skeletonTextFiveSixths} />
          <Skeleton className={skeletonTextFourSixths} />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, className }: SkeletonProps & { rows?: number; cols?: number }) {
  return (
    <div className={cn(skeletonTableContainer, className)}>
      <div className={skeletonTablePadding}>
        {/* Table Header */}
        <div className={skeletonHeaderBlock} style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={`header-${i}`} className={skeletonHeaderCell} />
          ))}
        </div>

        {/* Table Rows */}
        <div className={skeletonSpaceY4}>
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className={skeletonRow}
              style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
            >
              {Array.from({ length: cols }).map((_, colIndex) => (
                <Skeleton
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={cn(
                    lineStyles.lineHeight,
                    colIndex === 0
                      ? skeletonCellShort // First column (name/id) shorter
                      : colIndex === cols - 1
                        ? skeletonCellTiny // Last column (actions) shorter
                        : lineStyles.lineWidthFull,
                  )}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function DashboardPanelSkeleton({ rows = 4, className }: SkeletonProps & { rows?: number }) {
  return (
    <div className={cn(skeletonCard, className)}>
      <div className={skeletonSpaceY4}>
        <Skeleton className={skeletonCardTitle} />
        <div className={skeletonSpaceY3}>
          {Array.from({ length: rows }).map((_, index) => (
            <Skeleton key={index} className={index === rows - 1 ? skeletonTextFourSixths : skeletonLine} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div
      className={dashboardContainer}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label="Loading dashboard"
      aria-busy="true"
    >
      {/* Header */}
      <div className={skeletonSpaceY3}>
        <Skeleton className={skeletonHeaderTitle} />
        <Skeleton className={lineStyles.dashboardSubhead} />
      </div>

      {/* Summary Cards */}
      <div className={summaryGrid}>
        {Array.from({ length: 3 }).map((_, i) => (
          <SkeletonCard key={i} className={skeletonCardPadding} />
        ))}
      </div>

      {/* Verification */}
      <DashboardPanelSkeleton rows={3} />

      {/* Action Row */}
      <div className={actionRowGrid}>
        <SkeletonCard className={skeletonCardPadding} />
        <SkeletonCard className={skeletonCardPadding} />
      </div>

      {/* Pending Requests */}
      <SkeletonTable rows={5} cols={4} />

      {/* Activity + Sidebar */}
      <div className={dashboardGrid}>
        <DashboardPanelSkeleton rows={5} />
        <div className={skeletonSpaceY4}>
          <DashboardPanelSkeleton rows={3} />
          <DashboardPanelSkeleton rows={4} />
          <DashboardPanelSkeleton rows={3} />
        </div>
      </div>
    </div>
  );
}
