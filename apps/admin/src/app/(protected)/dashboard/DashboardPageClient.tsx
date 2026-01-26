import styles from '../../../components/ui/classNames.module.css';

export function DashboardPageClient() {
  return (
    <div className={styles.adminPageStack}>
      <div>
        <h1 className={styles.adminPageTitle}>Dashboard</h1>
        <p className={styles.adminPageSubtitle}>
          Next: totals by status, last 24h payment requests, ledger anomalies, verification queues.
        </p>
      </div>

      <div className={styles.adminDashboardGrid}>
        <div className={styles.adminDashboardCard}>
          <div className={styles.adminDashboardCardLabel}>Consumers</div>
          <div className={styles.adminDashboardCardValue}>—</div>
        </div>
        <div className={styles.adminDashboardCard}>
          <div className={styles.adminDashboardCardLabel}>Payment Requests</div>
          <div className={styles.adminDashboardCardValue}>—</div>
        </div>
        <div className={styles.adminDashboardCard}>
          <div className={styles.adminDashboardCardLabel}>Ledger Entries</div>
          <div className={styles.adminDashboardCardValue}>—</div>
        </div>
      </div>
    </div>
  );
}
