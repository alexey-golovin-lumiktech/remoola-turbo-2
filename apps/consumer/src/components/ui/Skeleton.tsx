import styles from './classNames.module.css';

const {
  dashboardContainer,
  flexRowBetween,
  gridMainContent,
  gridSummaryCards,
  skeletonBase,
  skeletonCard,
  skeletonCardPadding,
  skeletonCardTitle,
  skeletonCellShort,
  skeletonCellTiny,
  skeletonHeaderAction,
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
} = styles;

// Simple className utility since @remoola/ui/utils doesn't exist
function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(` `);
}

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
            `h-4`,
            i === lines - 1 ? `w-3/4` : `w-full`, // Last line shorter
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
                    `h-4`,
                    colIndex === 0
                      ? skeletonCellShort // First column (name/id) shorter
                      : colIndex === cols - 1
                        ? skeletonCellTiny // Last column (actions) shorter
                        : `w-full`,
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

export function DashboardSkeleton() {
  return (
    <div className={dashboardContainer}>
      {/* Header */}
      <div className={flexRowBetween}>
        <Skeleton className={skeletonHeaderTitle} />
        <Skeleton className={skeletonHeaderAction} />
      </div>

      {/* Summary Cards */}
      <div className={gridSummaryCards}>
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className={skeletonCardPadding} />
        ))}
      </div>

      {/* Action Row */}
      <SkeletonCard />

      {/* Main Content Grid */}
      <div className={gridMainContent}>
        <SkeletonTable rows={8} cols={5} />
        <div className={skeletonSpaceY4}>
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
