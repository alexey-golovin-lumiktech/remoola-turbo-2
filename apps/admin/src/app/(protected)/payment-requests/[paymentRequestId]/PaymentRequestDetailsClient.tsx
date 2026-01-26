'use client';

import { useEffect, useState } from 'react';

import { StatusPill, JsonView } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type PaymentRequest } from '../../../../lib';

export function PaymentRequestDetailsClient({ paymentRequestId }: { paymentRequestId: string }) {
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);

  useEffect(() => {
    async function getPaymentRequest(paymentRequestId: string): Promise<PaymentRequest | null> {
      const response = await fetch(`/api/payment-requests/${paymentRequestId}`, { cache: `no-store` });
      if (!response.ok) return null;
      return (await response.json()) as PaymentRequest;
    }

    getPaymentRequest(paymentRequestId).then(setPaymentRequest);
  }, [paymentRequestId]);

  if (!paymentRequest) return <div className={styles.adminTextGray600}>Payment request not found</div>;

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
    </div>
  );
}
