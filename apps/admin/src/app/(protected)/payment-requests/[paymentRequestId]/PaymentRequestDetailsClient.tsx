'use client';

import { useCallback, useEffect, useState } from 'react';

import { StatusPill, JsonView } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type PaymentRequest } from '../../../../lib';

export function PaymentRequestDetailsClient({ paymentRequestId }: { paymentRequestId: string }) {
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);
  const [reversalType, setReversalType] = useState<`refund` | `chargeback`>(`refund`);
  const [amount, setAmount] = useState<string>(``);
  const [reason, setReason] = useState<string>(``);
  const [submitStatus, setSubmitStatus] = useState<`idle` | `submitting` | `success` | `error`>(`idle`);
  const [submitMessage, setSubmitMessage] = useState<string | null>(null);
  const [didInitAmount, setDidInitAmount] = useState(false);

  const loadPaymentRequest = useCallback(async (requestId: string): Promise<PaymentRequest | null> => {
    const response = await fetch(`/api/payment-requests/${requestId}`, { cache: `no-store` });
    if (!response.ok) return null;
    return (await response.json()) as PaymentRequest;
  }, []);

  useEffect(() => {
    void loadPaymentRequest(paymentRequestId).then(setPaymentRequest);
  }, [loadPaymentRequest, paymentRequestId]);

  useEffect(() => {
    if (paymentRequest && !didInitAmount) {
      setAmount(paymentRequest.amount);
      setDidInitAmount(true);
    }
  }, [paymentRequest, didInitAmount]);

  if (!paymentRequest) return <div className={styles.adminTextGray600}>Payment request not found</div>;

  const canReverse = paymentRequest.status === `COMPLETED`;

  async function submitReversal(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canReverse) {
      setSubmitStatus(`error`);
      setSubmitMessage(`Only completed payment requests can be reversed`);
      return;
    }
    setSubmitStatus(`submitting`);
    setSubmitMessage(null);

    const normalizedAmount = amount.trim();
    const parsedAmount = normalizedAmount ? Number(normalizedAmount) : undefined;

    if (normalizedAmount && !Number.isFinite(parsedAmount)) {
      setSubmitStatus(`error`);
      setSubmitMessage(`Enter a valid amount`);
      return;
    }

    try {
      const response = await fetch(`/api/payment-requests/${paymentRequestId}/${reversalType}`, {
        method: `POST`,
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
        setSubmitStatus(`error`);
        setSubmitMessage(errorText || `Failed to create reversal`);
        return;
      }

      setSubmitStatus(`success`);
      setSubmitMessage(`Reversal created`);
      const refreshed = await loadPaymentRequest(paymentRequestId);
      setPaymentRequest(refreshed);
    } catch {
      setSubmitStatus(`error`);
      setSubmitMessage(`Failed to create reversal`);
    }
  }

  return (
    <div className={styles.adminPageStack}>
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
          Rail: {paymentRequest.paymentRail ?? `—`} • Payer: {paymentRequest.payer?.email ?? paymentRequest.payerId} •
          Requester:{` `}
          {paymentRequest.requester?.email ?? paymentRequest.requesterId}
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
          <form className={styles.adminPageStack} onSubmit={submitReversal}>
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
              {submitMessage && (
                <span className={submitStatus === `error` ? styles.adminFormError : `text-green-700`}>
                  {submitMessage}
                </span>
              )}
            </div>
            <div className={styles.adminTextGray500}>
              Reversals create ledger entries for both parties. Payment request status remains completed.
            </div>
            {!canReverse && <div className={styles.adminTextGray500}>This payment request is not completed yet.</div>}
          </form>
        </div>
      </div>
    </div>
  );
}
