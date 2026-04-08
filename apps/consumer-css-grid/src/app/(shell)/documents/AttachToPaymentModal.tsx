'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';

import {
  attachDocumentsToPaymentRequestMutation,
  getDraftPaymentRequestsAction,
  type DraftPaymentRequestOption,
} from '../../../lib/consumer-mutations.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';

function formatDate(value: string) {
  return new Date(value).toLocaleDateString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
  });
}

function formatAmount(amount: number, currencyCode: string) {
  return new Intl.NumberFormat(`en-US`, {
    style: `currency`,
    currency: currencyCode,
  }).format(amount);
}

export function AttachToPaymentModal({
  documentId,
  documentName,
  attachedDraftPaymentRequestIds,
  onClose,
}: {
  documentId: string;
  documentName: string;
  attachedDraftPaymentRequestIds: string[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [draftPayments, setDraftPayments] = useState<DraftPaymentRequestOption[]>([]);
  const [draftPaymentsTotal, setDraftPaymentsTotal] = useState(0);
  const [selectedPaymentRequestIds, setSelectedPaymentRequestIds] = useState<string[]>([]);
  const [message, setMessage] = useState<{ type: `error` | `success`; text: string } | null>(null);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      const result = await getDraftPaymentRequestsAction();
      if (!isActive) return;

      if (!result.ok) {
        if (handleSessionExpiredError(result.error)) return;
        setMessage({ type: `error`, text: result.error.message });
        setIsLoading(false);
        return;
      }

      setDraftPayments(result.items);
      setDraftPaymentsTotal(result.total);
      setIsLoading(false);
    })();

    return () => {
      isActive = false;
    };
  }, []);

  const availableDrafts = draftPayments.filter((payment) => !attachedDraftPaymentRequestIds.includes(payment.id));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#1a1a2e] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-6 py-4">
          <div className="min-w-0">
            <h3 className="truncate text-lg font-semibold text-white/90">Attach to payment</h3>
            <div className="mt-1 text-sm text-white/50">
              Choose one or more draft payment requests for `{documentName}`.
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="flex-1 overflow-auto px-6 py-5">
          {message ? (
            <div
              className={`mb-4 rounded-2xl border px-4 py-3 text-sm ${
                message.type === `error`
                  ? `border-rose-400/30 bg-rose-500/10 text-rose-200`
                  : `border-emerald-400/30 bg-emerald-500/10 text-emerald-200`
              }`}
            >
              {message.text}
            </div>
          ) : null}

          {isLoading ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/55">
              Loading draft payment requests...
            </div>
          ) : draftPayments.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-8 text-center text-sm text-white/55">
              No draft payment requests are available yet.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-white/50">
                {draftPaymentsTotal > draftPayments.length
                  ? `Showing ${draftPayments.length} of ${draftPaymentsTotal} draft payment requests.`
                  : `${draftPayments.length} draft payment request${draftPayments.length === 1 ? `` : `s`} available.`}
              </div>
              {draftPayments.map((payment) => {
                const alreadyAttached = attachedDraftPaymentRequestIds.includes(payment.id);
                const checked = selectedPaymentRequestIds.includes(payment.id);
                const title = payment.description || payment.counterpartyEmail || `Draft payment`;

                return (
                  <label
                    key={payment.id}
                    className={`flex items-start gap-3 rounded-2xl border px-4 py-4 transition ${
                      alreadyAttached
                        ? `border-amber-400/25 bg-amber-500/10`
                        : checked
                          ? `border-indigo-400/40 bg-indigo-500/10`
                          : `border-white/10 bg-white/5 hover:border-white/20`
                    } ${alreadyAttached ? `cursor-not-allowed` : `cursor-pointer`}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={alreadyAttached || isPending}
                      onChange={(event) => {
                        setSelectedPaymentRequestIds((current) =>
                          event.target.checked
                            ? [...current, payment.id]
                            : current.filter((currentId) => currentId !== payment.id),
                        );
                        setMessage(null);
                      }}
                      className="mt-1"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="font-medium text-white/90">{title}</div>
                        {alreadyAttached ? (
                          <span className="rounded-full border border-amber-400/30 bg-amber-500/10 px-2 py-1 text-[11px] text-amber-100">
                            Already attached
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-sm text-white/50">
                        {formatAmount(payment.amount, payment.currencyCode)} · {formatDate(payment.createdAt)}
                      </div>
                      <div className="mt-2 text-xs text-white/35">Payment ID: {payment.id}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {!isLoading && draftPayments.length > 0 && availableDrafts.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/55">
              This document is already attached to every draft payment request currently available.
            </div>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 px-6 py-4">
          <div className="text-sm text-white/45">
            {selectedPaymentRequestIds.length === 0
              ? `Select at least one draft payment request.`
              : `${selectedPaymentRequestIds.length} draft payment request${selectedPaymentRequestIds.length === 1 ? `` : `s`} selected`}
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/75 transition hover:bg-white/10"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isPending || selectedPaymentRequestIds.length === 0}
              onClick={() => {
                setMessage(null);
                startTransition(async () => {
                  for (const paymentRequestId of selectedPaymentRequestIds) {
                    const result = await attachDocumentsToPaymentRequestMutation(paymentRequestId, [documentId]);
                    if (!result.ok) {
                      if (handleSessionExpiredError(result.error)) return;
                      setMessage({ type: `error`, text: result.error.message });
                      return;
                    }
                  }

                  setSelectedPaymentRequestIds([]);
                  setMessage({
                    type: `success`,
                    text:
                      selectedPaymentRequestIds.length === 1
                        ? `Document attached to draft payment request.`
                        : `Document attached to ${selectedPaymentRequestIds.length} draft payment requests.`,
                  });
                  router.refresh();
                });
              }}
              className="rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? `Attaching...` : `Attach to payment`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
