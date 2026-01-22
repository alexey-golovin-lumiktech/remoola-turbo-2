// Simple className utility since @remoola/ui/utils doesn't exist
function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes.filter(Boolean).join(` `);
}

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div className={cn(`animate-pulse rounded-md bg-gray-200 dark:bg-slate-700`, className)} />;
}

export function SkeletonText({ className, lines = 1 }: SkeletonProps & { lines?: number }) {
  if (lines === 1) {
    return <Skeleton className={cn(`h-4 w-full`, className)} />;
  }

  return (
    <div className="space-y-2">
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
    <div className={cn(`rounded-2xl bg-white/90 dark:bg-slate-800/90 p-6 shadow-sm`, className)}>
      <div className="space-y-4">
        <Skeleton className="h-6 w-1/3" />
        <div className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-4/6" />
        </div>
      </div>
    </div>
  );
}

export function SkeletonTable({ rows = 5, cols = 4, className }: SkeletonProps & { rows?: number; cols?: number }) {
  return (
    <div className={cn(`bg-white dark:bg-slate-800 rounded-2xl shadow-sm border dark:border-slate-600`, className)}>
      <div className="p-6">
        {/* Table Header */}
        <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
          {Array.from({ length: cols }).map((_, i) => (
            <Skeleton key={`header-${i}`} className="h-4 w-20" />
          ))}
        </div>

        {/* Table Rows */}
        <div className="space-y-4">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <div
              key={`row-${rowIndex}`}
              className="grid gap-4 py-3 border-b last:border-b-0"
              style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
            >
              {Array.from({ length: cols }).map((_, colIndex) => (
                <Skeleton
                  key={`cell-${rowIndex}-${colIndex}`}
                  className={cn(
                    `h-4`,
                    colIndex === 0
                      ? `w-24` // First column (name/id) shorter
                      : colIndex === cols - 1
                        ? `w-16` // Last column (actions) shorter
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
    <div className="flex h-full flex-col gap-6 px-8 py-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-10 w-32" />
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonCard key={i} className="p-4" />
        ))}
      </div>

      {/* Action Row */}
      <SkeletonCard />

      {/* Main Content Grid */}
      <div className="grid gap-4 md:grid-cols-[2fr,1fr]">
        <SkeletonTable rows={8} cols={5} />
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    </div>
  );
}
