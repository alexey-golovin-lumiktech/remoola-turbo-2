'use client';

import { useEffect, useState } from 'react';

import { StatusPill, DataTable } from '../../../components';
import { type PaymentRequest } from '../../../lib';

export function PaymentRequestsPageClient() {
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);

  useEffect(() => {
    async function loadPaymentRequests(): Promise<PaymentRequest[]> {
      const response = await fetch(`/api/payment-requests`, { cache: `no-store`, credentials: `include` });
      if (!response.ok) return [];
      return await response.json();
    }

    loadPaymentRequests().then(setPaymentRequests);
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Payment Requests</h1>
        <p className="text-sm text-gray-600">Payment Request (payer/requester, status, rail, dates).</p>
      </div>

      <DataTable<PaymentRequest>
        rows={paymentRequests}
        getRowKeyAction={(r) => r.id}
        rowHrefAction={(r) => `/payment-requests/${r.id}`}
        columns={[
          {
            key: `id`,
            header: `ID`,
            render: (r) => <span className="font-mono text-xs">{r.id.slice(0, 8)}…</span>,
          },
          {
            key: `status`,
            header: `Status`,
            render: (r) => <StatusPill value={r.status} />,
          },
          {
            key: `amount`,
            header: `Amount`,
            render: (r) => (
              <span className="font-medium">
                {r.currencyCode} {r.amount}
              </span>
            ),
          },
          {
            key: `rail`,
            header: `Rail`,
            render: (r) => <span className="text-gray-700">{r.paymentRail ?? `—`}</span>,
          },
          {
            key: `payer`,
            header: `Payer`,
            render: (r) => <span className="text-gray-700">{r.payer?.email ?? r.payerId.slice(0, 8) + `…`}</span>,
          },
          {
            key: `req`,
            header: `Requester`,
            render: (r) => (
              <span className="text-gray-700">{r.requester?.email ?? r.requesterId.slice(0, 8) + `…`}</span>
            ),
          },
          {
            key: `created`,
            header: `Created`,
            render: (r) => <span className="text-gray-600">{new Date(r.createdAt).toLocaleString()}</span>,
          },
        ]}
      />
    </div>
  );
}
