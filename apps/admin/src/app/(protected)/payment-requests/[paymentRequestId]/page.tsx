'use client';

import { useEffect, useState } from 'react';

import { JsonView } from '../../../../components/JsonView';
import { StatusPill } from '../../../../components/StatusPill';
import { type PaymentRequest } from '../../../../lib/types';

export default function PaymentRequestDetails(props: { params: Promise<{ paymentRequestId: string }> }) {
  const [paymentRequest, setPaymentRequest] = useState<PaymentRequest | null>(null);

  useEffect(() => {
    async function getPaymentRequest(paymentRequestId: string): Promise<PaymentRequest | null> {
      const res = await fetch(`/api/payment-requests/${paymentRequestId}`, { cache: `no-store` });
      if (!res.ok) return null;
      return (await res.json()) as PaymentRequest;
    }

    props.params.then((params) => getPaymentRequest(params.paymentRequestId)).then(setPaymentRequest);
  }, [props]);

  if (!paymentRequest) return <div className="text-sm text-gray-600">Payment request not found</div>;

  return (
    <div className="space-y-4">
      <div>
        <div className="text-sm text-gray-500">Payment Request</div>
        <h1 className="text-2xl font-semibold">
          {paymentRequest.currencyCode} {paymentRequest.amount}
          {` `}
          <span className="ml-2 align-middle">
            <StatusPill value={paymentRequest.status} />
          </span>
        </h1>
        <div className="mt-1 text-sm text-gray-700">
          Rail: {paymentRequest.paymentRail ?? `—`} • Payer: {paymentRequest.payer?.email ?? paymentRequest.payerId} •
          Requester:{` `}
          {paymentRequest.requester?.email ?? paymentRequest.requesterId}
        </div>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <div className="text-sm font-semibold">Raw</div>
        <div className="mt-3">
          <JsonView value={paymentRequest} />
        </div>
      </div>
    </div>
  );
}
