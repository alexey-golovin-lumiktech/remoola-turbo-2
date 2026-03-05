import { SkeletonList, SkeletonText } from '../../../../shared/ui/SkeletonLoader';

export default function ExchangeScheduledLoading() {
  return (
    <div
      className="
        mx-auto
        max-w-md
        space-y-4
        p-4
      "
    >
      <SkeletonText className="h-7 w-56" />

      <SkeletonList count={3} />
    </div>
  );
}
