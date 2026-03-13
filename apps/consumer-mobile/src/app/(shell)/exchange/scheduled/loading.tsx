import styles from './loading.module.css';
import { SkeletonList, SkeletonText } from '../../../../shared/ui/SkeletonLoader';

export default function ExchangeScheduledLoading() {
  return (
    <div className={styles.wrapper}>
      <SkeletonText className={styles.titleSkeleton} />
      <SkeletonList count={3} />
    </div>
  );
}
