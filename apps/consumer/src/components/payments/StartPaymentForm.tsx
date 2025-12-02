'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function StartPaymentForm() {
  const router = useRouter();

  const [email, setEmail] = useState(``);
  const [amount, setAmount] = useState(``);
  const [description, setDescription] = useState(``);
  const [method, setMethod] = useState<`CREDIT_CARD` | `BANK_ACCOUNT`>(`CREDIT_CARD`);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setLoading(true);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/payments/start`, {
      method: `POST`,
      credentials: `include`,
      headers: { 'Content-Type': `application/json` },
      body: JSON.stringify({
        email,
        amount,
        description,
        method,
      }),
    });

    setLoading(false);

    if (res.ok) {
      const data = await res.json();
      router.push(`/payments/${data.paymentRequestId}`);
    } else {
      const err = await res.json().catch(() => ({}));
      alert(err.message || `Payment failed`);
    }
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-slate-700">Recipient Email</label>
        <input
          type="email"
          required
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Amount (USD)</label>
        <input
          type="number"
          step="0.01"
          min="0.01"
          required
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Description</label>
        <textarea
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Optional"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Payment Method</label>
        <select
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
          value={method}
          onChange={(e) => setMethod(e.target.value as `CREDIT_CARD` | `BANK_ACCOUNT`)}
        >
          <option value="CREDIT_CARD">Credit Card</option>
          <option value="BANK_ACCOUNT">Bank Account</option>
        </select>
      </div>

      <button
        disabled={loading}
        className="rounded-full bg-blue-600 px-6 py-2 text-sm font-semibold text-white shadow hover:bg-blue-700
        disabled:opacity-50"
      >
        {loading ? `Processing...` : `Send Payment`}
      </button>
    </form>
  );
}
