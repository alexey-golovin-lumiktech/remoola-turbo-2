import { SkeletonCard, SkeletonList, SkeletonText } from '../../../shared/ui/SkeletonLoader';

export default function ExchangeLoading() {
  return (
    <div
      className={`
  mx-auto
  max-w-2xl
  space-y-6
  p-4
  pb-24
      `}
    >
      <div>
        <SkeletonText className={`h-8 w-48`} />
        <SkeletonText className={`mt-1 h-4 w-64`} />
      </div>

      <SkeletonCard />

      <SkeletonCard />

      <SkeletonCard />

      <div className={`space-y-3`}>
        <SkeletonText className={`h-6 w-32`} />
        <SkeletonList count={2} />
      </div>
    </div>
  );
}
