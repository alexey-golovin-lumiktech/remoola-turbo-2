import styles from './loading.module.css';

export default function PaymentsLoading() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.headerLeft} />
        <div className={styles.headerRight} />
      </div>

      <div className={styles.grid}>
        <div className={styles.tile} />
        <div className={styles.tile} />
        <div className={styles.tile} />
      </div>

      <div className={styles.list}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={styles.listItem} />
        ))}
      </div>
    </div>
  );
}
