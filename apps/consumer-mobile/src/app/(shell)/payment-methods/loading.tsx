import styles from './loading.module.css';

export default function PaymentMethodsLoading() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.titleBar} />
        <div className={styles.actionBar} />
      </div>

      <div className={styles.grid}>
        {[1, 2].map((i) => (
          <div key={i} className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.cardRow}>
                <div className={styles.cardIcon} />
                <div className={styles.cardContent}>
                  <div className={styles.cardLine1} />
                  <div className={styles.cardLine2} />
                </div>
              </div>
              <div className={styles.cardActions}>
                <div className={styles.cardBtn} />
                <div className={styles.cardBtn} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
