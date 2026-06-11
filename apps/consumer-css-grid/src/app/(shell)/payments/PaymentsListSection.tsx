'use client';

import Link from 'next/link';
import { type ComponentProps } from 'react';

import { formatDate, formatMajorCurrency, formatRoleLabel, formatStatusLabel } from './payments-list-formatters';
import { formatPaymentTypeLabel } from './payments-list-query';
import { HelpContextualGuides } from '../../../features/help/ui';
import { type PaymentsResponse } from '../../../lib/consumer-api.server';
import { shellEmptyState } from '../../../shared/ui/shell-card-tokens';
import { Panel } from '../../../shared/ui/shell-panel';
import { ShellPagination } from '../../../shared/ui/ShellPagination';

type ContextualHelpGuide = ComponentProps<typeof HelpContextualGuides>[`guides`][number];

export function PaymentsListSection({
  applyFilters,
  emptyStateHelpGuides,
  isFilterPending,
  page,
  payments,
  total,
  totalPages,
}: {
  applyFilters: (nextPage?: number) => void;
  emptyStateHelpGuides: ContextualHelpGuide[];
  isFilterPending: boolean;
  page: number;
  payments: PaymentsResponse[`items`];
  total: number;
  totalPages: number;
}) {
  return (
    <Panel
      title="Recent payments"
      aside={`Page ${page} of ${totalPages} · ${payments.length} shown · ${total} total`}
      data-testid="payments-list"
    >
      {payments.length === 0 ? (
        <div className="mt-5 space-y-4">
          <div className={shellEmptyState}>No payments match the current filters.</div>
          <HelpContextualGuides
            guides={emptyStateHelpGuides}
            compact
            title="Need help finding the next payment step?"
            description="Use these guides to reset the flow, choose the right payment path, or understand what should appear in the list."
          />
        </div>
      ) : (
        <div className="mt-5 space-y-3">
          {payments.map((payment) => (
            <Link
              key={payment.id}
              href={`/payments/${payment.id}`}
              className="block rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4 transition hover:border-(--app-border-strong) hover:bg-(--app-surface-muted)"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-medium text-(--app-text)">
                    {payment.description ||
                      payment.counterparty.email ||
                      formatPaymentTypeLabel(payment.type || ``) ||
                      `Payment`}
                  </div>
                  <div className="mt-1 text-sm text-(--app-text-muted)">{formatDate(payment.createdAt)}</div>
                  <div className="mt-2 text-xs text-(--app-text-faint)">
                    {formatStatusLabel(payment.status)} · {formatRoleLabel(payment.role)} ·{` `}
                    {payment.counterparty.email || `No counterparty`}
                  </div>
                  {payment.latestTransaction ? (
                    <div className="mt-2 text-xs text-(--app-primary)">
                      Latest ledger update: {formatStatusLabel(payment.latestTransaction.status)} on{` `}
                      {formatDate(payment.latestTransaction.createdAt)}
                    </div>
                  ) : null}
                </div>
                <div className="text-right">
                  <div className="font-medium text-(--app-text)">
                    {formatMajorCurrency(payment.amount, payment.currencyCode)}
                  </div>
                  <div className="mt-1 text-sm text-(--app-text-muted)">{formatStatusLabel(payment.status)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <ShellPagination
        disabled={isFilterPending}
        onNext={() => applyFilters(page + 1)}
        onPrev={() => applyFilters(page - 1)}
        page={page}
        totalPages={totalPages}
      />
    </Panel>
  );
}
