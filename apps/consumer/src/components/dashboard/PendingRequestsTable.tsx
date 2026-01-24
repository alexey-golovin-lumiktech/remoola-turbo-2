'use client';

import { type IPendingRequest } from '../../types';
import {
  pendingRequestsBody,
  pendingRequestsCell,
  pendingRequestsDate,
  pendingRequestsEmptyCell,
  pendingRequestsHead,
  pendingRequestsHeadCell,
  pendingRequestsHeadCellRight,
  pendingRequestsHeader,
  pendingRequestsSection,
  pendingRequestsStatus,
  pendingRequestsTable,
  pendingRequestsTableWrapper,
  pendingRequestsTitle,
} from '../ui/classNames';

function formatAmount(amount: number, currency: string) {
  return new Intl.NumberFormat(undefined, {
    style: `currency`,
    currency,
  }).format(amount);
}

type PendingRequestsTableProps = { pendingRequests: IPendingRequest[] };

export function PendingRequestsTable({ pendingRequests }: PendingRequestsTableProps) {
  return (
    <section className={pendingRequestsSection}>
      <header className={pendingRequestsHeader}>
        <h2 className={pendingRequestsTitle}>Open Payment Requests</h2>
      </header>

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
              <tr key={pendingRequest.id}>
                <td className={pendingRequestsCell}>{pendingRequest.counterpartyName}</td>
                <td className={pendingRequestsCell}>
                  {formatAmount(pendingRequest.amount, pendingRequest.currencyCode)}
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
    </section>
  );
}
