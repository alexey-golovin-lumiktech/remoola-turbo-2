import styles from './loading.module.css';

export default function RootLoading() {
  return (
    <div
      className={styles.wrapper}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-busy="true"
      aria-label="Loading"
    >
      <div className={styles.content}>
        <div className={styles.spinner} />
        <div className={styles.bar} />
      </div>
    </div>
  );
}
