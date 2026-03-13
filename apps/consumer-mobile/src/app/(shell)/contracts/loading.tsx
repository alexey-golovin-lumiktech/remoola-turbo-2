import styles from './loading.module.css';

export default function ContractsLoading() {
  return (
    <div className={styles.wrapper}>
      <div className={styles.titleBar} />

      <div className={styles.list}>
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className={styles.item} />
        ))}
      </div>
    </div>
  );
}
