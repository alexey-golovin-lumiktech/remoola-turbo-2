'use client';

import { useRouter } from 'next/navigation';

export function ActionRow() {
  const router = useRouter();

  return (
    <section className="grid gap-4 md:grid-cols-[2fr,1fr]">
      <div className="flex items-center justify-between rounded-2xl bg-white/90 px-6 py-4 shadow-sm">
        <div>
          <p className="text-sm font-medium text-slate-900">Create Payment Request</p>
          <p className="text-xs text-slate-500">Send an invoice-like request in minutes.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/payment-requests/new`)}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
        >
          Create
        </button>
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-white/90 px-6 py-4 shadow-sm">
        <div>
          <p className="text-sm font-medium text-slate-900">Start Payment</p>
          <p className="text-xs text-slate-500">One-off payment flow (card or bank).</p>
        </div>
        <button
          type="button"
          onClick={() => router.push(`/payments/start`)}
          className="rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700"
        >
          Pay
        </button>
      </div>
    </section>
  );
}
