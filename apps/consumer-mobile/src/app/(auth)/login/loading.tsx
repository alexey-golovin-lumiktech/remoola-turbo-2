import styles from './loading.module.css';

export default function LoginLoading() {
  return (
    <div className={styles.wrapper} role="status" aria-live="polite" aria-busy="true" aria-label="Loading">
      <div className={styles.spinner} aria-hidden="true" />
    </div>
  );
}
