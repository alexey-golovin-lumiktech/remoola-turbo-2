'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

import { getPaymentDetailActionState } from './payment-detail-action-state';
import {
  createPaymentCheckoutSessionMutation,
  generateInvoiceMutation,
  payWithSavedMethodMutation,
  sendPaymentRequestMutation,
} from '../../../lib/consumer-mutations.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { Panel } from '../../../shared/ui/shell-primitives';

type PaymentMethod = {
  id: string;
  type: string;
  brand: string;
  last4: string;
  expMonth: string | null;
  expYear: string | null;
  defaultSelected: boolean;
  reusableForPayerPayments: boolean;
  billingDetails: {
    id: string;
    email: string | null;
    name: string | null;
    phone: string | null;
  } | null;
};

type Props = {
  paymentRequestId: string;
  status: string;
  role: string;
  paymentRail?: string | null;
  paymentMethods?: PaymentMethod[];
};

export function PaymentDetailActionsClient({
  paymentRequestId,
  status,
  role,
  paymentRail,
  paymentMethods = [],
}: Props) {
  const router = useRouter();
  const [isSending, startSendTransition] = useTransition();
  const [isPayingSaved, startSavedPaymentTransition] = useTransition();
  const [isStartingCheckout, startCheckoutTransition] = useTransition();
  const [isGeneratingInvoice, startInvoiceTransition] = useTransition();
  const [message, setMessage] = useState<{
    type: `success` | `error`;
    text: string;
    actionHref?: string;
    actionLabel?: string;
  } | null>(null);
  const savedCards = useMemo(
    () =>
      paymentMethods.filter((method) => method.type.toUpperCase() === `CREDIT_CARD` && method.reusableForPayerPayments),
    [paymentMethods],
  );
  const hasNonReusableCards = useMemo(
    () =>
      paymentMethods.some((method) => method.type.toUpperCase() === `CREDIT_CARD` && !method.reusableForPayerPayments),
    [paymentMethods],
  );
  const [selectedMethodId, setSelectedMethodId] = useState(
    savedCards.find((method) => method.defaultSelected)?.id ?? savedCards[0]?.id ?? ``,
  );

  const {
    canSend,
    canGenerateInvoice,
    canPayWithCard,
    isBankTransferPending,
    invoiceSourceLabel,
    aside,
    showEmptyState,
  } = getPaymentDetailActionState({
    status,
    role,
    paymentRail,
  });

  return (
    <Panel title="Actions" aside={aside}>
      {message ? (
        <div
          className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
            message.type === `error`
              ? `border-rose-400/30 bg-rose-500/10 text-rose-200`
              : `border-emerald-400/30 bg-emerald-500/10 text-emerald-200`
          }`}
        >
          {message.text}
          {message.actionHref && message.actionLabel ? (
            <div className="mt-3">
              <a
                href={message.actionHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-2xl border border-current/20 px-3 py-2 text-sm font-medium transition hover:bg-white/5"
              >
                {message.actionLabel}
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {canSend ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            This request is still a draft. Send it when the recipient, amount, and due date look correct.
          </div>
          <button
            type="button"
            disabled={isSending}
            onClick={() => {
              setMessage(null);
              startSendTransition(async () => {
                const result = await sendPaymentRequestMutation(paymentRequestId);
                if (!result.ok) {
                  if (handleSessionExpiredError(result.error)) return;
                  setMessage({ type: `error`, text: result.error.message });
                  return;
                }
                setMessage({ type: `success`, text: result.message ?? `Payment request sent` });
                router.refresh();
              });
            }}
            className="w-full rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isSending ? `Sending...` : `Send request`}
          </button>
        </div>
      ) : canPayWithCard ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
            This payment is waiting for the payer. Use a saved card for a one-click payment or open Stripe Checkout to
            pay with a new card.
          </div>

          {savedCards.length > 0 ? (
            <div className="space-y-3">
              <div className="text-sm text-white/60">Saved cards</div>
              {savedCards.map((method) => (
                <button
                  key={method.id}
                  type="button"
                  onClick={() => setSelectedMethodId(method.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${
                    selectedMethodId === method.id
                      ? `border-blue-400/40 bg-blue-500/10`
                      : `border-white/10 bg-white/5 hover:border-white/20`
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-medium text-white/90">
                        {method.brand} •••• {method.last4}
                      </div>
                      <div className="mt-1 text-sm text-white/45">
                        {method.expMonth && method.expYear
                          ? `Expires ${method.expMonth}/${method.expYear}`
                          : `Saved card`}
                      </div>
                      {method.billingDetails?.name ? (
                        <div className="mt-1 text-xs text-white/35">{method.billingDetails.name}</div>
                      ) : null}
                    </div>
                    {method.defaultSelected ? (
                      <span className="rounded-full border border-emerald-400/20 bg-emerald-500/15 px-3 py-1 text-xs text-emerald-300">
                        Default
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}

              <button
                type="button"
                disabled={isPayingSaved || !selectedMethodId}
                onClick={() => {
                  setMessage(null);
                  startSavedPaymentTransition(async () => {
                    const result = await payWithSavedMethodMutation(paymentRequestId, selectedMethodId);
                    if (!result.ok) {
                      if (handleSessionExpiredError(result.error)) return;
                      setMessage({ type: `error`, text: result.error.message });
                      return;
                    }
                    if (result.data.success) {
                      setMessage({ type: `success`, text: `Payment completed successfully` });
                      router.refresh();
                      return;
                    }
                    setMessage({
                      type: `error`,
                      text: `This saved method needs additional authentication. Try the checkout flow instead.`,
                    });
                  });
                }}
                className="w-full rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPayingSaved ? `Processing payment...` : `Pay with selected card`}
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/55">
              {hasNonReusableCards
                ? `No reusable saved cards are available yet. Cards added manually in Banking stay visible there, but one-click payer payments only work with reusable Stripe-backed cards.`
                : `No reusable saved cards are available for this account yet.`}
            </div>
          )}

          <button
            type="button"
            disabled={isStartingCheckout}
            onClick={() => {
              setMessage(null);
              startCheckoutTransition(async () => {
                const result = await createPaymentCheckoutSessionMutation(paymentRequestId);
                if (!result.ok) {
                  if (handleSessionExpiredError(result.error)) return;
                  setMessage({ type: `error`, text: result.error.message });
                  return;
                }
                if (!result.data.url) {
                  setMessage({ type: `error`, text: `Checkout session did not return a redirect URL` });
                  return;
                }
                window.location.assign(result.data.url);
              });
            }}
            className="w-full rounded-2xl border border-white/10 px-4 py-3 font-medium text-white/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isStartingCheckout ? `Opening checkout...` : `Pay with new card`}
          </button>
        </div>
      ) : isBankTransferPending ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 text-sm text-white/55">
          This payment is pending on the bank-transfer rail. Card checkout actions are not available for this payment.
        </div>
      ) : null}

      {canGenerateInvoice ? (
        <div className="space-y-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
            Generate a PDF invoice from the {invoiceSourceLabel}. The file will be added to this payment record so you
            can review or download it from attachments.
          </div>
          <button
            type="button"
            disabled={isGeneratingInvoice}
            onClick={() => {
              setMessage(null);
              startInvoiceTransition(async () => {
                const result = await generateInvoiceMutation(paymentRequestId);
                if (!result.ok) {
                  if (handleSessionExpiredError(result.error)) return;
                  setMessage({ type: `error`, text: result.error.message });
                  return;
                }

                const downloadUrl = result.data.downloadUrl?.trim();
                const invoiceNumber = result.data.invoiceNumber?.trim();
                setMessage({
                  type: `success`,
                  text: downloadUrl
                    ? `${invoiceNumber ?? `Invoice`} is ready. It was added to this payment's attachments.`
                    : `Invoice is ready and has been added to this payment's attachments.`,
                  ...(downloadUrl ? { actionHref: downloadUrl, actionLabel: `Open invoice` } : {}),
                });
                router.refresh();
                if (downloadUrl) {
                  window.open(downloadUrl, `_blank`, `noopener,noreferrer`);
                }
              });
            }}
            className="w-full rounded-2xl border border-white/10 px-4 py-3 font-medium text-white/85 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isGeneratingInvoice ? `Generating invoice...` : `Generate invoice PDF`}
          </button>
        </div>
      ) : null}

      {showEmptyState ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/45">
          No additional actions are available for this payment right now.
        </div>
      ) : null}
    </Panel>
  );
}
