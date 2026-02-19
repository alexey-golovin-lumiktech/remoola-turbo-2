'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { useLedgerAnomalies } from '../../lib/client';
import { getLocalToastMessage, localToastKeys } from '../../lib/error-messages';
import styles from '../ui/classNames.module.css';

export function LedgerAnomaliesCard() {
  const { data: anomalies, error, isLoading, mutate } = useLedgerAnomalies();

  useEffect(() => {
    if (error) toast.error(getLocalToastMessage(localToastKeys.LOAD_LEDGER_ANOMALIES));
  }, [error]);

  if (isLoading) {
    return (
      <div className={styles.adminCard}>
        <div className={styles.adminCardTitle}>Ledger Anomalies</div>
        <div className={styles.adminCardContent}>
          <div className={styles.adminSkeletonTextGroup}>
            <div className={styles.adminSkeletonTextLineFourFifths} />
            <div className={styles.adminSkeletonTextLineTwoThirds} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.adminCard}>
        <div className={styles.adminCardTitle}>Ledger Anomalies</div>
        <div className={styles.adminCardContent}>
          <button type="button" className={styles.adminPrimaryButton} onClick={() => void mutate()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!anomalies || anomalies.length === 0) {
    return (
      <div className={styles.adminCard}>
        <div className={styles.adminCardTitle}>Ledger Anomalies</div>
        <div className={styles.adminCardContent}>
          <div className={`${styles.adminTextGray500} flex items-center gap-2`}>
            <span className="text-green-600">✓</span>
            No ledger anomalies detected
          </div>
        </div>
      </div>
    );
  }

  const getAnomalyTypeColor = (type: string) => {
    switch (type) {
      case `duplicate`:
      case `amount_mismatch`:
      case `status_inconsistency`:
      case `premature_ledger_entry`:
        return `text-red-600`;
      case `missing_ledger_entry`:
      case `dangling_ledger_entry`:
      case `unlinked_payment_ledger_entry`:
        return `text-orange-600`;
      default:
        return `text-gray-600`;
    }
  };

  const getAnomalyTypeLabel = (type: string) => {
    switch (type) {
      case `duplicate`:
        return `Duplicate Entry`;
      case `missing_ledger_entry`:
        return `Missing Entry`;
      case `dangling_ledger_entry`:
        return `Dangling Ledger Entry`;
      case `unlinked_payment_ledger_entry`:
        return `Unlinked Payment Entry`;
      case `amount_mismatch`:
        return `Amount Mismatch`;
      case `status_inconsistency`:
        return `Status Issue`;
      case `premature_ledger_entry`:
        return `Premature Ledger Entry`;
      default:
        return type.replace(/_/g, ` `);
    }
  };

  return (
    <div className={styles.adminCard}>
      <div className={styles.adminCardTitle}>
        Ledger Anomalies
        <span className="ml-2 text-xs text-red-600 font-normal">({anomalies.length})</span>
      </div>
      <div className={styles.adminCardContent}>
        <div className="space-y-3">
          {anomalies.slice(0, 5).map((anomaly) => (
            <div key={anomaly.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
              <div className="flex items-start justify-between mb-1">
                <div className="flex-1">
                  <div className={`text-xs font-medium ${getAnomalyTypeColor(anomaly.type)} mb-1`}>
                    {getAnomalyTypeLabel(anomaly.type)}
                  </div>
                  <div className="text-sm text-gray-700">{anomaly.description}</div>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                {anomaly.paymentRequestId && (
                  <Link
                    href={`/payment-requests/${anomaly.paymentRequestId}`}
                    className="text-xs text-blue-600 hover:text-blue-800"
                  >
                    View Request
                  </Link>
                )}
                <span className={styles.adminTextGray500}>{new Date(anomaly.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
        {anomalies.length > 5 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Link href="/ledger/anomalies" className="text-sm text-blue-600 hover:text-blue-800">
              View all anomalies →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
