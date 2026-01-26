import styles from '../../../components/ui/classNames.module.css';

export function LoginSkeleton() {
  return (
    <div className={styles.adminLoginSkeletonContainer}>
      <div className={styles.adminLoginSkeletonCard}>
        <div className={styles.adminLoginSkeletonTitle} />
        <div className={styles.adminLoginSkeletonFields}>
          <div className={styles.adminLoginSkeletonField} />
          <div className={styles.adminLoginSkeletonField} />
          <div className={styles.adminLoginSkeletonField} />
        </div>
      </div>
    </div>
  );
}
