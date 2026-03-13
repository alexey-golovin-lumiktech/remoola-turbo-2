import styles from './loading.module.css';

export default function DocumentsLoading() {
  return (
    <div className={styles.page}>
      <div className={styles.stickyHeader}>
        <div className={styles.headerInner}>
          <div className={styles.headerTitle} />
          <div className={styles.headerSub} />
        </div>
      </div>
      <div className={styles.main}>
        <div className={styles.content}>
          <div className={styles.toolbar}>
            <div className={styles.chips}>
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={styles.chip} />
              ))}
            </div>
            <div className={styles.toolbarAction} />
          </div>

          <div className={styles.tabsRow}>
            <div className={styles.tabLabel} />
            <div className={styles.tabMeta} />
          </div>

          <div className={styles.grid}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className={styles.card}>
                <div className={styles.cardRow}>
                  <div className={styles.cardCheck} />
                  <div className={styles.cardContent}>
                    <div className={styles.cardInner}>
                      <div className={styles.cardThumb} />
                      <div className={styles.cardText}>
                        <div className={styles.cardTitle} />
                        <div className={styles.cardMeta}>
                          <div className={styles.cardMetaA} />
                          <div className={styles.cardMetaB} />
                        </div>
                      </div>
                      <div className={styles.cardAction} />
                    </div>
                    <div className={styles.cardActions}>
                      <div className={styles.cardBtn} />
                      <div className={styles.cardBtn} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
