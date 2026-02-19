'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

import {
  StatusTotalsCard,
  RecentPaymentRequestsCard,
  LedgerAnomaliesCard,
  VerificationQueueCard,
} from '../../../components/dashboard';
import styles from '../../../components/ui/classNames.module.css';
import { useDashboardStats } from '../../../lib/client';
import { getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';

export function DashboardPageClient() {
  const {
    data: stats,
    error: statsError,
    isLoading: statsLoading,
    isValidating: statsValidating,
    mutate: mutateStats,
  } = useDashboardStats();

  useEffect(() => {
    if (statsError) toast.error(getLocalToastMessage(localToastKeys.LOAD_DASHBOARD_STATS));
  }, [statsError]);

  return (
    <div className={styles.adminPageStack}>
      <div className={styles.adminHeaderRow}>
        <div>
          <h1 className={styles.adminPageTitle}>Dashboard</h1>
          <p className={styles.adminPageSubtitle}>
            Overview of payment requests, ledger activity, and verification status.
          </p>
        </div>
        <button
          type="button"
          className={styles.adminPrimaryButton}
          onClick={() => void mutateStats()}
          disabled={statsValidating}
        >
          {statsValidating ? `Refreshing...` : `Refresh`}
        </button>
      </div>

      {statsError && (
        <div className={styles.adminCard}>
          <div className={styles.adminCardContent}>
            <button type="button" className={styles.adminPrimaryButton} onClick={() => void mutateStats()}>
              Retry
            </button>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className={styles.adminDashboardGrid}>
        <div className={styles.adminDashboardCard}>
          <div className={styles.adminDashboardCardLabel}>Consumers</div>
          <div className={styles.adminDashboardCardValue}>
            {statsLoading ? `—` : (stats?.consumers.total || 0).toLocaleString()}
          </div>
          {stats && !statsLoading && (
            <div className="mt-1 text-xs text-gray-500">
              {stats.consumers.verified} verified • {stats.consumers.unverified} pending
            </div>
          )}
        </div>
        <div className={styles.adminDashboardCard}>
          <div className={styles.adminDashboardCardLabel}>Payment Requests</div>
          <div className={styles.adminDashboardCardValue}>
            {statsLoading ? `—` : (stats?.paymentRequests.total || 0).toLocaleString()}
          </div>
        </div>
        <div className={styles.adminDashboardCard}>
          <div className={styles.adminDashboardCardLabel}>Ledger Entries</div>
          <div className={styles.adminDashboardCardValue}>
            {statsLoading ? `—` : (stats?.ledger.total || 0).toLocaleString()}
          </div>
          {stats && !statsLoading && stats.ledger.anomalies > 0 && (
            <div className="mt-1 text-xs text-red-600">{stats.ledger.anomalies} anomalies detected</div>
          )}
        </div>
      </div>

      {/* Dashboard Components Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <StatusTotalsCard />
        <RecentPaymentRequestsCard />
        <LedgerAnomaliesCard />
        <VerificationQueueCard />
      </div>
    </div>
  );
}
