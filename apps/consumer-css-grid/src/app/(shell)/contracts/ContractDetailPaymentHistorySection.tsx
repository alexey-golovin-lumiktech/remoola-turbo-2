import Link from 'next/link';

import { type ContractDetailViewModel } from './contract-detail-model';
import { shellEmptyState } from '../../../shared/ui/shell-card-tokens';
import { StatusPill } from '../../../shared/ui/shell-indicators';
import { Panel } from '../../../shared/ui/shell-panel';

export function ContractDetailPaymentHistorySection({ viewModel }: { viewModel: ContractDetailViewModel }) {
  return (
    <Panel title="Payment history for this contract" aside={`${viewModel.contract.summary.paymentsCount} total`}>
      <div className="mb-4 rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)">
        Each payment row stays linked to the existing payment detail route, but this screen frames the activity as one
        contractor relationship.
      </div>
      {viewModel.contract.summary.paymentsCount === 0 ? (
        <div className={shellEmptyState}>No payment history for this contract yet.</div>
      ) : (
        <div className="space-y-3">
          {viewModel.paymentItems.map((payment) => (
            <Link
              key={payment.id}
              href={payment.href}
              className="block rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4 transition hover:border-(--app-border-strong) hover:bg-(--app-surface-muted)"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-(--app-text)">Payment request</div>
                    <StatusPill status={payment.statusLabel} />
                  </div>
                  <div className="mt-2 text-sm text-(--app-text-muted)">Created {payment.createdAtLabel}</div>
                  <div className="mt-2 text-xs text-(--app-text-faint)">{payment.id}</div>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-sm text-(--app-text-muted)">Amount</div>
                  <div className="mt-1 text-lg font-medium text-(--app-text)">{payment.amount}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </Panel>
  );
}
