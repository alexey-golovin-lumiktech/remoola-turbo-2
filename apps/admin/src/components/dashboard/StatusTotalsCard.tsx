'use client';

import { useEffect } from 'react';
import { toast } from 'sonner';

import { usePaymentRequestsByStatus } from '../../lib/client';
import { getLocalToastMessage, localToastKeys } from '../../lib/error-messages';
import styles from '../ui/classNames.module.css';

export function StatusTotalsCard() {
  const { data: statusData, error, isLoading, mutate } = usePaymentRequestsByStatus();

  useEffect(() => {
    if (error) toast.error(getLocalToastMessage(localToastKeys.LOAD_STATUS_TOTALS));
  }, [error]);

  if (isLoading) {
    return (
      <div className={styles.adminCard}>
        <div className={styles.adminCardTitle}>Totals by Status</div>
        <div className={styles.adminCardContent}>
          <div className={styles.adminSkeletonTextGroup}>
            <div className={styles.adminSkeletonTextLineTwoThirds} />
            <div className={styles.adminSkeletonTextLineHalf} />
            <div className={styles.adminSkeletonTextLineFourFifths} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.adminCard}>
        <div className={styles.adminCardTitle}>Totals by Status</div>
        <div className={styles.adminCardContent}>
          <button type="button" className={styles.adminPrimaryButton} onClick={() => void mutate()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!statusData || statusData.length === 0) {
    return (
      <div className={styles.adminCard}>
        <div className={styles.adminCardTitle}>Totals by Status</div>
        <div className={styles.adminCardContent}>
          <div className={styles.adminTextGray500}>No payment requests found</div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case `COMPLETED`:
        return styles.adminStatusPillGood;
      case `DENIED`:
      case `UNCOLLECTIBLE`:
        return styles.adminStatusPillBad;
      case `DRAFT`:
      case `WAITING`:
      case `WAITING_RECIPIENT_APPROVAL`:
      case `PENDING`:
        return styles.adminStatusPillNeutral;
      default:
        return styles.adminStatusPillNeutral;
    }
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat(`en-US`, {
      style: `currency`,
      currency: `USD`,
    }).format(num);
  };

  return (
    <div className={styles.adminCard}>
      <div className={styles.adminCardTitle}>Totals by Status</div>
      <div className={styles.adminCardContent}>
        <div className="space-y-3">
          {statusData.map((item) => (
            <div key={item.status} className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`${styles.adminStatusPillBase} ${getStatusColor(item.status)}`}>
                  {item.status.replace(/_/g, ` `)}
                </span>
                <span className={styles.adminTextGray700}>{item.count}</span>
              </div>
              <span className={styles.adminTextMedium}>{formatAmount(item.totalAmount)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
