import styles from './loading.module.css';

export default function CreatePaymentRequestLoading() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.titleBar} />
      <div className={styles.subtitleBar} />
      <div className={styles.card} />
    </div>
  );
}
