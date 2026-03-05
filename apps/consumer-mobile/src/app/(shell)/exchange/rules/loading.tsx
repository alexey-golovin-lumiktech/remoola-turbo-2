import { SkeletonList, SkeletonText } from '../../../../shared/ui/SkeletonLoader';

export default function ExchangeRulesLoading() {
  return (
    <div
      className="
        mx-auto
        max-w-md
        space-y-4
        p-4
      "
    >
      <SkeletonText className="h-7 w-48" />

      <SkeletonList count={3} />
    </div>
  );
}
