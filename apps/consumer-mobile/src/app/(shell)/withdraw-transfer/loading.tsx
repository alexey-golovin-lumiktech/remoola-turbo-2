import { SkeletonCard } from '../../../shared/ui/SkeletonLoader';

export default function WithdrawTransferLoading() {
  return (
    <div
      className="
        mx-auto
        max-w-2xl
        space-y-6
        p-4
        pb-20
      "
    >
      <div
        className="
          h-8
          w-48
          animate-pulse
          rounded
          bg-slate-200
          dark:bg-slate-700
        "
      />

      <div
        className="
          space-y-4
        "
      >
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
