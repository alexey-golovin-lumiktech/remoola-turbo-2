import styles from './loading.module.css';

export default function ContactsLoading() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.header}>
        <div className={styles.titleBar} />
        <div className={styles.actionBar} />
      </div>

      <div className={styles.searchBar} />

      <div className={styles.grid}>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className={styles.card}>
            <div className={styles.cardBody}>
              <div className={styles.cardRow}>
                <div className={styles.avatar} />
                <div className={styles.cardContent}>
                  <div className={styles.cardLine1} />
                  <div className={styles.cardLine2} />
                </div>
              </div>
            </div>
            <div className={styles.cardFooter}>
              <div className={styles.cardFooterBtn} />
              <div className={styles.cardFooterBtnRight} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
