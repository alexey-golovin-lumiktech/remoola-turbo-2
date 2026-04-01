import Link from 'next/link';

import { getDocuments, getPaymentMethods, getPaymentView } from '../../../../lib/consumer-api.server';
import { CreditCardIcon } from '../../../../shared/ui/icons/CreditCardIcon';
import { PageHeader, Panel } from '../../../../shared/ui/shell-primitives';
import { PaymentAttachmentsClient } from '../PaymentAttachmentsClient';
import { PaymentDetailActionsClient } from '../PaymentDetailActionsClient';

function formatMajorCurrency(amount: number, currencyCode: string) {
  return new Intl.NumberFormat(`en-US`, {
    style: `currency`,
    currency: currencyCode,
  }).format(amount);
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return `—`;
  return new Date(value).toLocaleString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
    hour: `2-digit`,
    minute: `2-digit`,
  });
}

function formatDateOnly(value: string | null | undefined) {
  if (!value) return `—`;
  const isoDate = value.slice(0, 10);
  const [year, month, day] = isoDate.split(`-`).map(Number);
  if (!year || !month || !day) return `—`;

  return new Intl.DateTimeFormat(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
    timeZone: `UTC`,
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === `string` ? value : Array.isArray(value) ? (value[0] ?? ``) : ``;
}

type SearchParams = Record<string, string | string[] | undefined>;

export default async function PaymentDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ paymentRequestId: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const { paymentRequestId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const payment = await getPaymentView(paymentRequestId, { redirectTo: `/payments/${paymentRequestId}` });
  const checkoutSuccess = getSingleValue(resolvedSearchParams?.success) === `1`;
  const checkoutCanceled = getSingleValue(resolvedSearchParams?.canceled) === `1`;
  const attachmentPage = Math.max(1, Number(getSingleValue(resolvedSearchParams?.attachmentPage)) || 1);
  const paymentMethods =
    payment && payment.role === `PAYER` && payment.status === `PENDING`
      ? await getPaymentMethods({ redirectTo: `/payments/${paymentRequestId}` })
      : null;
  const availableDocuments =
    payment && payment.role === `REQUESTER` && payment.status === `DRAFT`
      ? await getDocuments(attachmentPage, 20, { redirectTo: `/payments/${paymentRequestId}` })
      : null;

  return (
    <div>
      <PageHeader title="Payment details" icon={<CreditCardIcon className="h-10 w-10 text-white" />} />

      {checkoutSuccess ? (
        <div className="mb-5 rounded-2xl border border-transparent bg-[var(--app-success-soft)] px-4 py-3 text-sm text-[var(--app-success-text)]">
          Checkout returned successfully. Refreshing payment status may take a moment while Stripe confirms the charge.
        </div>
      ) : null}
      {checkoutCanceled ? (
        <div className="mb-5 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--app-text-soft)]">
          Checkout was canceled before the payment completed.
        </div>
      ) : null}

      <div className="mb-5">
        <Link href="/payments" className="text-sm text-[var(--app-primary)] hover:text-[var(--app-primary-strong)]">
          Back to payments
        </Link>
      </div>

      {!payment ? (
        <Panel title="Payment details">
          <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-10 text-center text-sm text-[var(--app-text-muted)]">
            Payment details are unavailable for this request.
          </div>
        </Panel>
      ) : (
        <section className="grid grid-cols-1 gap-5 xl:grid-cols-[0.95fr_1.05fr]">
          <div className="space-y-5">
            <Panel title="Overview">
              <div className="space-y-3">
                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--app-text-soft)]">
                  Amount: {formatMajorCurrency(payment.amount, payment.currencyCode)}
                </div>
                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--app-text-soft)]">
                  Status: {payment.status}
                </div>
                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--app-text-soft)]">
                  Role: {payment.role}
                </div>
                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--app-text-soft)]">
                  Description: {payment.description?.trim() ? payment.description : `No description`}
                </div>
              </div>
            </Panel>

            <Panel title="Parties">
              <div className="space-y-3">
                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--app-text-soft)]">
                  Payer: {payment.payer?.email ?? `Unknown`}
                </div>
                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--app-text-soft)]">
                  Requester: {payment.requester?.email ?? `Unknown`}
                </div>
              </div>
            </Panel>
          </div>

          <div className="space-y-5">
            <Panel title="Timeline">
              <div className="space-y-3">
                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--app-text-soft)]">
                  Created: {formatDateTime(payment.createdAt)}
                </div>
                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--app-text-soft)]">
                  Updated: {formatDateTime(payment.updatedAt)}
                </div>
                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--app-text-soft)]">
                  Due date: {formatDateOnly(payment.dueDate)}
                </div>
                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--app-text-soft)]">
                  Sent date: {formatDateTime(payment.sentDate)}
                </div>
              </div>
            </Panel>

            <PaymentDetailActionsClient
              paymentRequestId={payment.id}
              status={payment.status}
              role={payment.role}
              paymentRail={payment.ledgerEntries[0]?.rail ?? null}
              paymentMethods={paymentMethods?.items ?? []}
            />

            <Panel title="Ledger entries">
              {payment.ledgerEntries.length === 0 ? (
                <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-10 text-center text-sm text-[var(--app-text-muted)]">
                  No ledger entries yet.
                </div>
              ) : (
                <div className="space-y-3">
                  {payment.ledgerEntries.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] p-4"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-medium text-[var(--app-text)]">
                            {entry.type} · {entry.direction}
                          </div>
                          <div className="mt-1 text-sm text-[var(--app-text-muted)]">
                            {formatDateTime(entry.createdAt)}
                          </div>
                          <div className="mt-1 text-xs text-[var(--app-text-faint)]">
                            {entry.rail ?? `No rail`} · {entry.ledgerId}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-[var(--app-text)]">
                            {formatMajorCurrency(entry.amount, entry.currencyCode)}
                          </div>
                          <div className="mt-1 text-sm text-[var(--app-text-muted)]">{entry.status}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Panel>

            <Panel title="Attachments">
              <PaymentAttachmentsClient
                paymentRequestId={payment.id}
                role={payment.role}
                status={payment.status}
                attachments={payment.attachments}
                availableDocuments={availableDocuments?.items ?? []}
                availableDocumentsTotal={availableDocuments?.total ?? 0}
                availableDocumentsPage={availableDocuments?.page ?? attachmentPage}
                availableDocumentsPageSize={availableDocuments?.pageSize ?? 20}
              />
            </Panel>
          </div>
        </section>
      )}
    </div>
  );
}
