'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { CardSkeleton, StatusPill, JsonView } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type PaymentRequest } from '../../../../lib';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../../lib/error-messages';

export function PaymentRequestDetailsClient({ paymentRequestId }: { paymentRequestId: string }) {
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [reversalType, setReversalType] = useState<`refund` | `chargeback`>(`refund`);
  const [amount, setAmount] = useState<string>(``);
  const [reason, setReason] = useState<string>(``);
  const [submitStatus, setSubmitStatus] = useState<`idle` | `submitting` | `success` | `error`>(`idle`);
  const [didInitAmount, setDidInitAmount] = useState(false);
  const [showReversalConfirmModal, setShowReversalConfirmModal] = useState(false);

  const loadPaymentRequest = useCallback(async (requestId: string): Promise<PaymentRequest | null> => {
    const response = await fetch(`/api/payment-requests/${requestId}`, { cache: `no-store`, credentials: `include` });
    if (!response.ok) return null;
    return (await response.json()) as PaymentRequest;
  }, []);

  useEffect(() => {
    setLoading(true);
    void loadPaymentRequest(paymentRequestId).then((data) => {
      setPaymentRequest(data);
      setLoading(false);
    });
  }, [loadPaymentRequest, paymentRequestId]);

  useEffect(() => {
    if (paymentRequest && !didInitAmount) {
      setAmount(paymentRequest.amount);
      setDidInitAmount(true);
    }
  }, [paymentRequest, didInitAmount]);

  if (loading) {
    return (
      <div className={styles.adminPageStack}>
        <div className={styles.adminCard}>
          <div className={styles.adminCardContent}>
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (!paymentRequest) {
    return (
      <div className={styles.adminPageStack}>
        <div className={styles.adminTextGray600}>Payment request not found</div>
        <Link href="/payment-requests" className={styles.adminPrimaryButton}>
          Back to Payment requests
        </Link>
      </div>
    );
  }

  const canReverse = paymentRequest.status === `COMPLETED`;

  function openReversalConfirmModal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canReverse) {
      toast.error(getLocalToastMessage(localToastKeys.REVERSAL_ONLY_COMPLETED));
      return;
    }

    const normalizedAmount = amount.trim();
    const parsedAmount = normalizedAmount ? Number(normalizedAmount) : undefined;

    if (normalizedAmount && !Number.isFinite(parsedAmount)) {
      toast.error(getLocalToastMessage(localToastKeys.REVERSAL_VALID_AMOUNT));
      return;
    }

    setShowReversalConfirmModal(true);
  }

  async function confirmReversal() {
    if (!canReverse) return;
    setShowReversalConfirmModal(false);
    setSubmitStatus(`submitting`);

    const normalizedAmount = amount.trim();
    const parsedAmount = normalizedAmount ? Number(normalizedAmount) : undefined;

    try {
      const response = await fetch(`/api/payment-requests/${paymentRequestId}/${reversalType}`, {
        method: `POST`,
        credentials: `include`,
        headers: {
          'content-type': `application/json`,
        },
        body: JSON.stringify({
          amount: parsedAmount,
          reason: reason.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        setSubmitStatus(`idle`);
        toast.error(getErrorMessageForUser(errorText, getLocalToastMessage(localToastKeys.REVERSAL_CREATE_FAILED)));
        return;
      }

      setSubmitStatus(`idle`);
      toast.success(getLocalToastMessage(localToastKeys.REVERSAL_CREATED));
      const refreshed = await loadPaymentRequest(paymentRequestId);
      setPaymentRequest(refreshed);
    } catch {
      setSubmitStatus(`idle`);
      toast.error(getLocalToastMessage(localToastKeys.REVERSAL_CREATE_FAILED));
    }
  }

  return (
    <div className={styles.adminPageStack}>
      <div className={styles.adminTextGray600} style={{ marginBottom: `0.5rem` }}>
        <Link href="/payment-requests">← Back to Payment requests</Link>
      </div>
      <div>
        <div className={styles.adminTextGray500}>Payment Request</div>
        <h1 className={styles.adminPageTitle}>
          {paymentRequest.currencyCode} {paymentRequest.amount}
          {` `}
          <span className={styles.adminInlineStatusPill}>
            <StatusPill value={paymentRequest.status} />
          </span>
        </h1>
        <div className={styles.adminDetailMeta}>
          Rail: {paymentRequest.paymentRail ?? `—`} • Payer:{` `}
          {paymentRequest.payer?.email ?? paymentRequest.payerEmail ?? paymentRequest.payerId ?? `—`} • Requester:{` `}
          {paymentRequest.requester?.email ?? paymentRequest.requesterId ?? `—`}
        </div>
      </div>

      <div className={styles.adminCard}>
        <div className={styles.adminCardTitle}>Raw</div>
        <div className={styles.adminCardContent}>
          <JsonView value={paymentRequest} />
        </div>
      </div>

      <div className={styles.adminCard}>
        <div className={styles.adminCardTitle}>Refund / Chargeback</div>
        <div className={styles.adminCardContent}>
          <form className={styles.adminPageStack} onSubmit={openReversalConfirmModal}>
            <label className={styles.adminFormLabelBlock}>
              <span className={styles.adminFormLabelText}>Action</span>
              <select
                className={styles.adminFormInput}
                value={reversalType}
                onChange={(event) => setReversalType(event.target.value as `refund` | `chargeback`)}
              >
                <option value="refund">Refund</option>
                <option value="chargeback">Chargeback</option>
              </select>
            </label>
            <label className={styles.adminFormLabelBlock}>
              <span className={styles.adminFormLabelText}>Amount</span>
              <input
                className={styles.adminFormInput}
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                placeholder={`Defaults to full amount`}
              />
            </label>
            <label className={styles.adminFormLabelBlock}>
              <span className={styles.adminFormLabelText}>Reason (optional)</span>
              <textarea
                className={styles.adminFormInput}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
              />
            </label>

            <div className={styles.adminActionRow}>
              <button
                className={styles.adminPrimaryButton}
                type="submit"
                disabled={submitStatus === `submitting` || !canReverse}
              >
                {submitStatus === `submitting` ? `Submitting...` : `Create reversal`}
              </button>
            </div>
            <div className={styles.adminTextGray500}>
              Reversals create ledger entries for both parties. Payment request status remains completed.
            </div>
            {!canReverse && <div className={styles.adminTextGray500}>This payment request is not completed yet.</div>}
          </form>
        </div>
      </div>

      {/* Reversal confirmation modal */}
      {showReversalConfirmModal && (
        <div className={styles.adminModalOverlay}>
          <div className={styles.adminModalCard}>
            <div className={styles.adminModalHeader}>
              <div>
                <div className={styles.adminModalTitle}>Confirm reversal</div>
                <div className={styles.adminModalSubtitle}>
                  You are about to create a {reversalType} of{` `}
                  {amount.trim()
                    ? `${paymentRequest.currencyCode} ${amount.trim()}`
                    : `full amount (${paymentRequest.currencyCode} ${paymentRequest.amount})`}
                  . This will create ledger entries for both parties.
                </div>
              </div>
              <button
                type="button"
                className={styles.adminModalClose}
                onClick={(e) => (e.stopPropagation(), e.preventDefault(), setShowReversalConfirmModal(false))}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className={styles.adminModalBody}>
              <div className={styles.adminModalFooter}>
                <button
                  className={styles.adminModalCancel}
                  onClick={(e) => (e.stopPropagation(), e.preventDefault(), setShowReversalConfirmModal(false))}
                >
                  Cancel
                </button>
                <button
                  className={styles.adminModalPrimary}
                  onClick={(e) => (e.stopPropagation(), e.preventDefault(), void confirmReversal())}
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
