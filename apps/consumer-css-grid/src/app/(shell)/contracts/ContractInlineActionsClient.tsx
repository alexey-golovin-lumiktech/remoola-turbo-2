'use client';

import Link from 'next/link';
import { useState, useTransition } from 'react';

import {
  createPaymentCheckoutSessionMutation,
  generateInvoiceMutation,
  sendPaymentRequestMutation,
} from '../../../lib/consumer-mutations.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { getPaymentDetailActionState } from '../payments/payment-detail-action-state';
import { type PaymentFlowContext } from '../payments/payment-flow-context';

type Props = {
  paymentRequestId: string;
  status: string;
  role: string;
  paymentRail?: string | null;
  paymentDetailHref: string;
  filesHref: string;
  paymentFlowContext: PaymentFlowContext;
};

export function ContractInlineActionsClient({
  paymentRequestId,
  status,
  role,
  paymentRail,
  paymentDetailHref,
  filesHref,
  paymentFlowContext,
}: Props) {
  const [isSending, startSendTransition] = useTransition();
  const [isStartingCheckout, startCheckoutTransition] = useTransition();
  const [isGeneratingInvoice, startInvoiceTransition] = useTransition();
  const [message, setMessage] = useState<{ type: `success` | `error`; text: string; actionHref?: string } | null>(null);

  const { canSend, canGenerateInvoice, canPayWithCard, isBankTransferPending } = getPaymentDetailActionState({
    status,
    role,
    paymentRail,
  });

  if (!canSend && !canGenerateInvoice && !canPayWithCard && !isBankTransferPending) {
    return null;
  }

  return (
    <div className="space-y-4">
      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm ${
            message.type === `error`
              ? `border-rose-400/30 bg-rose-500/10 text-rose-200`
              : `border-emerald-400/30 bg-emerald-500/10 text-emerald-200`
          }`}
        >
          <div>{message.text}</div>
          {message.actionHref ? (
            <div className="mt-2">
              <a
                href={message.actionHref}
                target="_blank"
                rel="noreferrer"
                className="inline-flex rounded-xl border border-current/20 px-3 py-2 text-sm font-medium transition hover:bg-white/5"
              >
                Open generated invoice
              </a>
            </div>
          ) : null}
        </div>
      ) : null}

      {canSend ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            The current contract workflow is still a requester draft. You can send it directly from this workspace.
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isSending}
              onClick={() => {
                setMessage(null);
                startSendTransition(async () => {
                  const result = await sendPaymentRequestMutation(paymentRequestId, paymentFlowContext);
                  if (!result.ok) {
                    if (handleSessionExpiredError(result.error)) return;
                    setMessage({ type: `error`, text: result.error.message });
                    return;
                  }
                  setMessage({ type: `success`, text: result.message ?? `Payment request sent` });
                  if (typeof window !== `undefined`) {
                    window.location.reload();
                  }
                });
              }}
              className="rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSending ? `Sending...` : `Send active draft`}
            </button>
            <Link
              href={filesHref}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/8"
            >
              Open contract files
            </Link>
            <Link
              href={paymentDetailHref}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/8"
            >
              Open payment detail
            </Link>
          </div>
        </div>
      ) : null}

      {canGenerateInvoice ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/70">
            The current requester-side workflow can generate an invoice without leaving the contract workspace.
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isGeneratingInvoice}
              onClick={() => {
                setMessage(null);
                startInvoiceTransition(async () => {
                  const result = await generateInvoiceMutation(paymentRequestId, paymentFlowContext);
                  if (!result.ok) {
                    if (handleSessionExpiredError(result.error)) return;
                    setMessage({ type: `error`, text: result.error.message });
                    return;
                  }
                  setMessage({
                    type: `success`,
                    text: result.message ?? `Invoice is ready`,
                    actionHref: result.data.downloadUrl,
                  });
                  if (result.data.downloadUrl) {
                    window.open(result.data.downloadUrl, `_blank`, `noopener,noreferrer`);
                  }
                });
              }}
              className="rounded-2xl border border-white/10 px-4 py-3 font-medium text-white/85 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isGeneratingInvoice ? `Generating invoice...` : `Generate invoice inline`}
            </button>
            <Link
              href={paymentDetailHref}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/8"
            >
              Open payment detail
            </Link>
          </div>
        </div>
      ) : null}

      {canPayWithCard ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
            The current contract workflow is pending on the payer side. Start Stripe Checkout directly from this
            workspace.
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={isStartingCheckout}
              onClick={() => {
                setMessage(null);
                startCheckoutTransition(async () => {
                  const result = await createPaymentCheckoutSessionMutation(paymentRequestId, paymentFlowContext);
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
              className="rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isStartingCheckout ? `Opening checkout...` : `Pay now with new card`}
            </button>
            <Link
              href={paymentDetailHref}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/8"
            >
              Open full payment actions
            </Link>
          </div>
        </div>
      ) : null}

      {isBankTransferPending ? (
        <div className="space-y-3">
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
            The current contract workflow is pending on the bank-transfer rail. Continue in payment detail for the exact
            settlement state.
          </div>
          <Link
            href={paymentDetailHref}
            className="inline-flex rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/8"
          >
            Open payment detail
          </Link>
        </div>
      ) : null}
    </div>
  );
}
