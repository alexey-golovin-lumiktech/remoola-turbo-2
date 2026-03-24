'use client';

import Link from 'next/link';

import localStyles from './PendingRequestsTable.module.css';
import { formatCurrencyDisplay } from '../../lib/currency';
import { type IPendingRequest } from '../../types';
import styles from '../ui/classNames.module.css';

const {
  pendingRequestsBody,
  pendingRequestsCell,
  pendingRequestsDate,
  pendingRequestsEmptyCell,
  pendingRequestsHead,
  pendingRequestsHeadCell,
  pendingRequestsHeadCellRight,
  pendingRequestsHeader,
  pendingRequestsLinkHint,
  pendingRequestsNameLink,
  pendingRequestsRow,
  pendingRequestsSection,
  pendingRequestsStatus,
  pendingRequestsTable,
  pendingRequestsTableWrapper,
  pendingRequestsTitle,
} = styles;

type PendingRequestsTableProps = { pendingRequests: IPendingRequest[] };

export function PendingRequestsTable({ pendingRequests }: PendingRequestsTableProps) {
  return (
    <section className={pendingRequestsSection}>
      <header className={pendingRequestsHeader}>
        <h2 className={pendingRequestsTitle}>Open Payment Requests</h2>
      </header>

      <div className={localStyles.mobileList}>
        {pendingRequests.length === 0 ? (
          <div className={localStyles.mobileEmpty}>No open payment requests yet.</div>
        ) : (
          pendingRequests.map((pendingRequest) => (
            <article key={pendingRequest.id} className={localStyles.mobileCard}>
              <div className={localStyles.mobileHeader}>
                <Link href={`/payments/${pendingRequest.id}`} className={localStyles.mobileNameLink}>
                  <span>{pendingRequest.counterpartyName}</span>
                  <span className={pendingRequestsLinkHint}>Open request</span>
                </Link>
                <div className={localStyles.mobileAmount}>
                  {formatCurrencyDisplay(pendingRequest.amount, pendingRequest.currencyCode)}
                </div>
              </div>

              <div className={localStyles.mobileMetaGrid}>
                <div>
                  <div className={localStyles.mobileMetaLabel}>Status</div>
                  <div className={localStyles.mobileStatus}>{pendingRequest.status.replace(/_/g, ` `)}</div>
                </div>
                <div>
                  <div className={localStyles.mobileMetaLabel}>Last activity</div>
                  <div className={localStyles.mobileDate}>
                    {pendingRequest.lastActivityAt
                      ? new Intl.DateTimeFormat(undefined, {
                          dateStyle: `medium`,
                        }).format(new Date(pendingRequest.lastActivityAt))
                      : `—`}
                  </div>
                </div>
              </div>
            </article>
          ))
        )}
      </div>

      <div className={localStyles.desktopTable}>
        <div className={pendingRequestsTableWrapper}>
          <table className={pendingRequestsTable}>
            <thead className={pendingRequestsHead}>
              <tr>
                <th className={pendingRequestsHeadCell}>Name</th>
                <th className={pendingRequestsHeadCell}>Amount</th>
                <th className={pendingRequestsHeadCell}>Status</th>
                <th className={pendingRequestsHeadCellRight}>Last activity</th>
              </tr>
            </thead>
            <tbody className={pendingRequestsBody}>
              {pendingRequests.length === 0 && (
                <tr>
                  <td colSpan={4} className={pendingRequestsEmptyCell}>
                    No open payment requests yet.
                  </td>
                </tr>
              )}

              {pendingRequests.map((pendingRequest) => (
                <tr key={pendingRequest.id} className={pendingRequestsRow}>
                  <td className={pendingRequestsCell}>
                    <Link href={`/payments/${pendingRequest.id}`} className={pendingRequestsNameLink}>
                      <span>{pendingRequest.counterpartyName}</span>
                      <span className={pendingRequestsLinkHint}>Open request</span>
                    </Link>
                  </td>
                  <td className={pendingRequestsCell}>
                    {formatCurrencyDisplay(pendingRequest.amount, pendingRequest.currencyCode)}
                  </td>
                  <td className={pendingRequestsStatus}>{pendingRequest.status.replace(/_/g, ` `)}</td>
                  <td className={pendingRequestsDate}>
                    {pendingRequest.lastActivityAt
                      ? new Intl.DateTimeFormat(undefined, {
                          dateStyle: `medium`,
                        }).format(new Date(pendingRequest.lastActivityAt))
                      : `—`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
