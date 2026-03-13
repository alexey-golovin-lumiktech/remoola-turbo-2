import styles from './loading.module.css';

export default function DashboardLoading() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headerLeft} />
        <div className={styles.headerRight} />
      </div>

      <div className={styles.grid}>
        <div className={styles.card} />
        <div className={styles.card} />
      </div>

      <div className={styles.blockLg} />
      <div className={styles.blockMd} />
    </div>
  );
}
