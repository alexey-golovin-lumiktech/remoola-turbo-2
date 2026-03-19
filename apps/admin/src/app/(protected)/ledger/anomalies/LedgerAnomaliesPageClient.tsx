'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { PageSkeleton } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { useLedgerAnomalies } from '../../../../lib/client';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../../lib/error-messages';
import { isUnauthorizedError, type LoadState } from '../../../../lib/load-state';

const typeLabelMap: Record<string, string> = {
  duplicate: `Duplicate Entry`,
  missing_ledger_entry: `Missing Entry`,
  dangling_ledger_entry: `Dangling Ledger Entry`,
  unlinked_payment_ledger_entry: `Unlinked Payment Entry`,
  amount_mismatch: `Amount Mismatch`,
  status_inconsistency: `Status Issue`,
  premature_ledger_entry: `Premature Ledger Entry`,
};

const typeColorMap: Record<string, string> = {
  duplicate: `text-red-600`,
  amount_mismatch: `text-red-600`,
  status_inconsistency: `text-red-600`,
  premature_ledger_entry: `text-red-600`,
  missing_ledger_entry: `text-orange-600`,
  dangling_ledger_entry: `text-orange-600`,
  unlinked_payment_ledger_entry: `text-orange-600`,
};

export function LedgerAnomaliesPageClient() {
  const { data: anomalies, error, isLoading, isValidating, mutate } = useLedgerAnomalies();

  useEffect(() => {
    if (error && !isUnauthorizedError(error)) {
      toast.error(getErrorMessageForUser(error.message, getLocalToastMessage(localToastKeys.LOAD_LEDGER_ANOMALIES)));
    }
  }, [error]);

  const isUnauthorized = error && isUnauthorizedError(error);
  const loadState: LoadState = isLoading ? `loading` : isUnauthorized ? `unauthorized` : error ? `error` : `ready`;

  if (loadState === `loading`) {
    return (
      <div className={styles.adminPageStack}>
        <div>
          <h1 className={styles.adminPageTitle}>Ledger Anomalies</h1>
          <p className={styles.adminPageSubtitle}>Ledger inconsistencies and reconciliation issues.</p>
        </div>
        <PageSkeleton />
      </div>
    );
  }

  return (
    <div className={styles.adminPageStack}>
      <div className={styles.adminHeaderRow}>
        <div>
          <h1 className={styles.adminPageTitle}>Ledger Anomalies</h1>
          <p className={styles.adminPageSubtitle}>Ledger inconsistencies and reconciliation issues.</p>
        </div>
        <div className={styles.adminActionRow}>
          <button
            type="button"
            className={styles.adminPrimaryButton}
            onClick={() => void mutate()}
            disabled={isValidating}
          >
            {isValidating ? `Refreshing...` : `Refresh`}
          </button>
          <Link href="/ledger" className={styles.adminPrimaryButton}>
            View ledger
          </Link>
        </div>
      </div>

      {loadState === `unauthorized` && (
        <div className={styles.adminCard} data-testid="ledger-anomalies-unauthorized">
          <div className={styles.adminCardContent}>
            <p className={styles.adminTextGray600}>Session expired. Redirecting…</p>
          </div>
        </div>
      )}
      {loadState === `error` && (
        <div className={styles.adminCard}>
          <div className={styles.adminCardContent}>
            <button type="button" className={styles.adminPrimaryButton} onClick={() => void mutate()}>
              Retry
            </button>
          </div>
        </div>
      )}

      {loadState === `ready` && (!anomalies || anomalies.length === 0) && (
        <div className={styles.adminCard}>
          <div className={styles.adminCardContent}>
            <div className={`${styles.adminTextGray500} flex items-center gap-2`}>
              <span className="text-green-600">✓</span>
              No ledger anomalies detected
            </div>
          </div>
        </div>
      )}

      {loadState === `ready` && anomalies && anomalies.length > 0 && (
        <div className="space-y-3">
          {anomalies.map((anomaly) => (
            <div key={anomaly.id} className={styles.adminCard}>
              <div className={styles.adminCardContent}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className={`text-xs font-medium ${typeColorMap[anomaly.type] ?? `text-gray-600`}`}>
                      {typeLabelMap[anomaly.type] ?? anomaly.type.replace(/_/g, ` `)}
                    </div>
                    <div className="mt-1 text-sm text-gray-700">{anomaly.description}</div>
                  </div>
                  <div className={styles.adminTextGray500}>{new Date(anomaly.createdAt).toLocaleString()}</div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-500">
                  {anomaly.paymentRequestId ? (
                    <Link
                      href={`/payment-requests/${anomaly.paymentRequestId}`}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Payment request
                    </Link>
                  ) : (
                    <span>Payment request —</span>
                  )}

                  {anomaly.consumerId ? (
                    <Link href={`/consumers/${anomaly.consumerId}`} className="text-blue-600 hover:text-blue-800">
                      Consumer
                    </Link>
                  ) : (
                    <span>Consumer —</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
