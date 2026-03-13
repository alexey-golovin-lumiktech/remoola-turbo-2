import styles from './loading.module.css';
import { SkeletonCard, SkeletonList, SkeletonText } from '../../../shared/ui/SkeletonLoader';

export default function ExchangeLoading() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.headerBlock}>
        <SkeletonText className={styles.titleSkeleton} />
        <SkeletonText className={styles.subtitleSkeleton} />
      </div>

      <SkeletonCard />
      <SkeletonCard />
      <SkeletonCard />

      <div className={styles.section}>
        <SkeletonText className={styles.sectionTitle} />
        <SkeletonList count={2} />
      </div>
    </div>
  );
}
