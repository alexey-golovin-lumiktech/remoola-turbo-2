import Link from 'next/link';

import styles from './PendingRequestsTable.module.css';
import { ChevronRightIcon } from '../../../shared/ui/icons/ChevronRightIcon';
import { ClockIcon } from '../../../shared/ui/icons/ClockIcon';

interface PendingRequest {
  id: string;
  counterpartyName: string;
  amount: number;
  currencyCode: string;
  status: string;
  lastActivityAt: string | null;
}

interface PendingRequestsTableProps {
  requests: PendingRequest[];
  maxItems?: number;
}

/**
 * PendingRequestsTable - Mobile-optimized table for pending payment requests
 */
export function PendingRequestsTable({ requests, maxItems = 5 }: PendingRequestsTableProps) {
  const displayedRequests = requests.slice(0, maxItems);

  if (displayedRequests.length === 0) {
    return null;
  }

  return (
    <div className={styles.card} style={{ animationDelay: `100ms` }}>
      <div className={styles.header}>
        <div className={styles.headerRow}>
          <div className={styles.headerLeft}>
            <div className={styles.headerIconWrap}>
              <ClockIcon className={styles.headerIcon} strokeWidth={2.5} />
            </div>
            <h3 className={styles.headerTitle}>Pending requests</h3>
          </div>
          {requests.length > maxItems ? (
            <Link href="/payments" className={styles.viewAllLink}>
              View all ({requests.length})
            </Link>
          ) : null}
        </div>
      </div>

      <div className={styles.list}>
        {displayedRequests.map((req, index) => (
          <Link
            key={req.id}
            href={`/payments/${req.id}`}
            className={styles.row}
            style={{ animationDelay: `${100 + index * 50}ms` }}
          >
            <div className={styles.rowContent}>
              <div className={styles.rowMain}>
                <p className={styles.rowTitle}>{req.counterpartyName}</p>
                <p className={styles.rowSub}>
                  {req.amount.toFixed(2)} {req.currencyCode}
                </p>
              </div>
              <div className={styles.rowRight}>
                <span className={styles.badge}>{req.status}</span>
                <ChevronRightIcon className={styles.rowChevron} strokeWidth={2.5} />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
