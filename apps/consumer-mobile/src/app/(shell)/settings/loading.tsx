import styles from './loading.module.css';

export default function SettingsLoading() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.titleBar} />
      <div className={styles.section}>
        <div className={styles.blockLg} />
        <div className={styles.blockMd} />
        <div className={styles.blockSm} />
      </div>
    </div>
  );
}
