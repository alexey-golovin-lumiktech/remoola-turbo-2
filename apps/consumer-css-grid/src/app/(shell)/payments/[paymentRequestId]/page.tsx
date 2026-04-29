import Link from 'next/link';
import { Suspense } from 'react';

import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from '../../../../features/help/get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from '../../../../features/help/guide-registry';
import { HelpContextualGuides } from '../../../../features/help/ui';
import {
  getContractDetails,
  getDocuments,
  getPaymentMethods,
  getPaymentView,
  type PaymentViewResponse,
} from '../../../../lib/consumer-api.server';
import { CreditCardIcon } from '../../../../shared/ui/icons/CreditCardIcon';
import { PageHeader, Panel } from '../../../../shared/ui/shell-primitives';
import { buildPaymentDetailHref, getPaymentFlowBackHref, parsePaymentFlowContext } from '../payment-flow-context';
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
  const paymentFlowContext = parsePaymentFlowContext({
    contractId: resolvedSearchParams?.contractId,
    returnTo: resolvedSearchParams?.returnTo,
  });
  const detailPath = buildPaymentDetailHref(paymentRequestId, paymentFlowContext);
  const [payment, contract] = await Promise.all([
    getPaymentView(paymentRequestId, { redirectTo: detailPath }),
    paymentFlowContext?.contractId ? getContractDetails(paymentFlowContext.contractId) : Promise.resolve(null),
  ]);
  const checkoutSuccess = getSingleValue(resolvedSearchParams?.success) === `1`;
  const checkoutCanceled = getSingleValue(resolvedSearchParams?.canceled) === `1`;
  const attachmentPage = Math.max(1, Number(getSingleValue(resolvedSearchParams?.attachmentPage)) || 1);
  const paymentDetailHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.PAYMENTS_DETAIL,
    preferredSlugs: [
      HELP_GUIDE_SLUG.PAYMENTS_STATUSES,
      HELP_GUIDE_SLUG.PAYMENTS_COMMON_ISSUES,
      HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW,
    ],
  });
  const paymentUnavailableHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.PAYMENTS_DETAIL,
    preferredSlugs: [HELP_GUIDE_SLUG.PAYMENTS_OVERVIEW, HELP_GUIDE_SLUG.PAYMENTS_COMMON_ISSUES],
    limit: 2,
  });
  const paymentMethods =
    payment && payment.role === `PAYER` && payment.status === `PENDING`
      ? await getPaymentMethods({ redirectTo: detailPath })
      : null;

  return (
    <div>
      <PageHeader title="Payment details" icon={<CreditCardIcon className="h-10 w-10 text-white" />} />

      {checkoutSuccess ? (
        <div className="mb-5 rounded-2xl border border-transparent bg-[var(--app-success-soft)] px-4 py-3 text-sm text-[var(--app-success-text)]">
          <div>
            Checkout returned successfully. Refreshing payment status may take a moment while Stripe confirms the
            charge.
          </div>
          <Link
            href={`/help/${HELP_GUIDE_SLUG.PAYMENTS_STATUSES}`}
            className="mt-3 inline-flex text-sm underline underline-offset-4"
          >
            Review payment statuses and what should happen next
          </Link>
        </div>
      ) : null}
      {checkoutCanceled ? (
        <div className="mb-5 rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-3 text-sm text-[var(--app-text-soft)]">
          <div>Checkout was canceled before the payment completed.</div>
          <Link
            href={`/help/${HELP_GUIDE_SLUG.PAYMENTS_COMMON_ISSUES}`}
            className="mt-3 inline-flex text-sm text-[var(--app-primary)] hover:text-[var(--app-primary-strong)]"
          >
            Open the payment troubleshooting guide
          </Link>
        </div>
      ) : null}

      <div className="mb-5">
        <Link
          href={getPaymentFlowBackHref(paymentFlowContext)}
          className="text-sm text-[var(--app-primary)] hover:text-[var(--app-primary-strong)]"
        >
          {paymentFlowContext?.contractId ? `Back to contract` : `Back to payments`}
        </Link>
      </div>

      {contract ? (
        <div className="mb-5 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
          Opened from contract: {contract.name?.trim() || contract.email || `Unknown contractor`}. Return to the
          relationship workspace when this payment step is complete.
        </div>
      ) : null}

      {!payment ? (
        <Panel title="Payment details">
          <div className="space-y-4">
            <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-10 text-center text-sm text-[var(--app-text-muted)]">
              Payment details are unavailable for this request.
            </div>
            <HelpContextualGuides
              guides={paymentUnavailableHelpGuides}
              compact
              title="Need help with a missing payment detail?"
              description="These guides explain how the payments area is structured and where to look next if a detail page is not usable right now."
            />
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
              paymentFlowContext={paymentFlowContext}
            />

            <HelpContextualGuides
              guides={paymentDetailHelpGuides}
              compact
              title="Need help with this payment state?"
              description="Use these guides to interpret the current status, choose the right next action, or troubleshoot a blocked flow from the detail page."
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
              <Suspense
                fallback={
                  <div className="rounded-2xl border border-[color:var(--app-border)] bg-[var(--app-surface-muted)] px-4 py-10 text-center text-sm text-[var(--app-text-muted)]">
                    Loading attachments...
                  </div>
                }
              >
                <PaymentAttachmentsServerSection
                  attachmentPage={attachmentPage}
                  detailPath={detailPath}
                  payment={payment}
                  paymentFlowContext={paymentFlowContext}
                />
              </Suspense>
            </Panel>
          </div>
        </section>
      )}
    </div>
  );
}

async function PaymentAttachmentsServerSection({
  attachmentPage,
  detailPath,
  payment,
  paymentFlowContext,
}: {
  attachmentPage: number;
  detailPath: string;
  payment: PaymentViewResponse;
  paymentFlowContext: ReturnType<typeof parsePaymentFlowContext>;
}) {
  const availableDocuments =
    payment.role === `REQUESTER` && payment.status === `DRAFT`
      ? await getDocuments(attachmentPage, 20, { redirectTo: detailPath })
      : null;

  return (
    <PaymentAttachmentsClient
      paymentRequestId={payment.id}
      role={payment.role}
      status={payment.status}
      attachments={payment.attachments}
      availableDocuments={availableDocuments?.items ?? []}
      availableDocumentsTotal={availableDocuments?.total ?? 0}
      availableDocumentsPage={availableDocuments?.page ?? attachmentPage}
      availableDocumentsPageSize={availableDocuments?.pageSize ?? 20}
      contractId={paymentFlowContext?.contractId}
      returnTo={paymentFlowContext?.returnTo}
    />
  );
}
