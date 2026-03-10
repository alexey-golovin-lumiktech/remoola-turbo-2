export function SkeletonCard() {
  return (
    <div
      className={`
        animate-pulse
        rounded-lg
        border
        border-slate-200
        dark:border-slate-700
        bg-white
        dark:bg-slate-800
        p-4
      `}
    >
      <div className={`h-4 w-1/3 rounded-xs bg-slate-200 dark:bg-slate-700`} />
      <div className={`mt-2 h-6 w-1/2 rounded-xs bg-slate-200 dark:bg-slate-700`} />
    </div>
  );
}

export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className={`space-y-3`}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className={`
            animate-pulse
            rounded-lg
            border
            border-slate-200
            dark:border-slate-700
            bg-white
            dark:bg-slate-800
            p-4
          `}
        >
          <div className={`h-5 w-3/4 rounded-xs bg-slate-200 dark:bg-slate-700`} />
          <div className={`mt-2 h-4 w-1/2 rounded-xs bg-slate-200 dark:bg-slate-700`} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonStat() {
  return (
    <div
      className={`
        animate-pulse
        rounded-lg
        border
        border-slate-200
        dark:border-slate-700
        bg-white
        dark:bg-slate-800
        p-4
        shadow-xs
      `}
    >
      <div className={`h-3 w-20 rounded-xs bg-slate-200 dark:bg-slate-700`} />
      <div className={`mt-2 h-7 w-24 rounded-xs bg-slate-200 dark:bg-slate-700`} />
    </div>
  );
}

export function SkeletonText({ className }: { className?: string }) {
  return (
    <div
      className={`
        animate-pulse
        rounded-xs
        bg-slate-200
        dark:bg-slate-700
        ${className ?? `h-4 w-full`}
      `}
    />
  );
}

export function SkeletonForm() {
  return (
    <div className={`space-y-4`}>
      <div>
        <div className={`mb-2 h-4 w-24 rounded-xs bg-slate-200 dark:bg-slate-700`} />
        <div
          className={`
            h-11
            w-full
            rounded-lg
            border
            border-slate-200
            dark:border-slate-700
            bg-slate-100
            dark:bg-slate-800
          `}
        />
      </div>
      <div>
        <div className={`mb-2 h-4 w-32 rounded-xs bg-slate-200 dark:bg-slate-700`} />
        <div
          className={`
            h-11
            w-full
            rounded-lg
            border
            border-slate-200
            dark:border-slate-700
            bg-slate-100
            dark:bg-slate-800
          `}
        />
      </div>
      <div>
        <div className={`mb-2 h-4 w-28 rounded-xs bg-slate-200 dark:bg-slate-700`} />
        <div
          className={`
            h-24
            w-full
            rounded-lg
            border
            border-slate-200
            dark:border-slate-700
            bg-slate-100
            dark:bg-slate-800
          `}
        />
      </div>
      <div className={`h-11 w-full rounded-lg bg-slate-200 dark:bg-slate-700`} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className={`space-y-3`}>
      <div
        className={`
          flex
          gap-4
          border-b
          border-slate-200
          dark:border-slate-700
          pb-2
        `}
      >
        <div className={`h-4 w-1/4 rounded-xs bg-slate-200 dark:bg-slate-700`} />
        <div className={`h-4 w-1/4 rounded-xs bg-slate-200 dark:bg-slate-700`} />
        <div className={`h-4 w-1/4 rounded-xs bg-slate-200 dark:bg-slate-700`} />
        <div className={`h-4 w-1/4 rounded-xs bg-slate-200 dark:bg-slate-700`} />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={`flex gap-4`}>
          <div className={`h-4 w-1/4 rounded-xs bg-slate-200 dark:bg-slate-700`} />
          <div className={`h-4 w-1/4 rounded-xs bg-slate-200 dark:bg-slate-700`} />
          <div className={`h-4 w-1/4 rounded-xs bg-slate-200 dark:bg-slate-700`} />
          <div className={`h-4 w-1/4 rounded-xs bg-slate-200 dark:bg-slate-700`} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonPaymentCard() {
  return (
    <div
      className={`
        animate-pulse
        rounded-lg
        border
        border-slate-200
        dark:border-slate-700
        bg-white
        dark:bg-slate-800
        p-4
      `}
    >
      <div className={`flex items-start justify-between`}>
        <div className={`flex-1 space-y-2`}>
          <div className={`h-5 w-40 rounded-xs bg-slate-200 dark:bg-slate-700`} />
          <div className={`h-4 w-24 rounded-xs bg-slate-200 dark:bg-slate-700`} />
          <div className={`h-6 w-32 rounded-xs bg-slate-200 dark:bg-slate-700`} />
        </div>
        <div className={`h-6 w-16 rounded-full bg-slate-200 dark:bg-slate-700`} />
      </div>
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className={`space-y-6`}>
      <div className={`grid grid-cols-2 gap-4`}>
        <SkeletonStat />
        <SkeletonStat />
      </div>
      <div className={`space-y-3`}>
        <div className={`h-5 w-48 rounded-xs bg-slate-200 dark:bg-slate-700`} />
        <SkeletonPaymentCard />
        <SkeletonPaymentCard />
        <SkeletonPaymentCard />
      </div>
    </div>
  );
}
