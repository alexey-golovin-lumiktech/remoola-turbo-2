import styles from './loading.module.css';
import { SkeletonCard } from '../../../shared/ui/SkeletonLoader';

export default function WithdrawTransferLoading() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.titleBar} />
      <div className={styles.cards}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  );
}
