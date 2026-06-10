import Link from 'next/link';

import { type ContactDetailsResponse } from '../../../lib/consumer-api.server';
import { shellEmptyState } from '../../../shared/ui/shell-card-tokens';
import { StatusPill } from '../../../shared/ui/shell-indicators';
import { Panel } from '../../../shared/ui/shell-panel';

function formatDateOnly(value: string | null | undefined) {
  if (!value) return `—`;
  return new Date(value).toLocaleDateString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
  });
}

function formatStatusLabel(status: string) {
  return status
    .toLowerCase()
    .split(`_`)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(` `);
}

export function ContactDetailPaymentRecordsSection({ contact }: { contact: ContactDetailsResponse }) {
  const totalPayments = contact.paymentRequests.length;

  return (
    <Panel title="Matching payment records" aside={`${totalPayments} total`}>
      <div className="mb-4 rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)">
        This endpoint matches payment records by contact email and returns the amount, effective status, and created
        date for each record.
      </div>
      {totalPayments === 0 ? (
        <div className={shellEmptyState}>No matching payment records yet.</div>
      ) : (
        <div className="space-y-3">
          {contact.paymentRequests.map((payment) => (
            <Link
              key={payment.id}
              href={`/payments/${payment.id}`}
              className="block rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4 transition hover:border-(--app-border-strong) hover:bg-(--app-surface-muted)"
            >
              <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-start">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium text-(--app-text)">Payment record</div>
                    <StatusPill status={formatStatusLabel(payment.status)} />
                  </div>
                  <div className="mt-2 text-sm text-(--app-text-muted)">
                    Created {formatDateOnly(payment.createdAt)}
                  </div>
                  <div className="mt-2 text-xs text-(--app-text-faint)">{payment.id}</div>
                </div>
                <div className="text-left md:text-right">
                  <div className="text-sm text-(--app-text-muted)">Amount from contact details endpoint</div>
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
