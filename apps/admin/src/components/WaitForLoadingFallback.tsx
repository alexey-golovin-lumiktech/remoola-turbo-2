import styles from './ui/classNames.module.css';

export function WaitForLoadingFallback() {
  return <div className={styles.adminLoadingFallback}>Wait for loading...</div>;
}
