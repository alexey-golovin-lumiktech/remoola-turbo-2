import styles from './loading.module.css';

export default function LoginLoading() {
  return (
    <div className={styles.wrapper} aria-busy="true">
      <div className={styles.spinner} />
    </div>
  );
}
