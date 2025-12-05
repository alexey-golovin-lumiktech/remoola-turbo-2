'use client';

import { useState } from 'react';

import { SuccessModal } from './SuccessModal';

export function WithdrawForm() {
  const [amount, setAmount] = useState(``);
  const [method, setMethod] = useState<`CARD` | `BANK` | ``>(``);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | undefined>();
  const [successOpen, setSuccessOpen] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(undefined);

    const numericAmount = Number(amount);

    if (!amount || isNaN(numericAmount) || numericAmount <= 0) {
      setErr(`Please enter a valid amount.`);
      return;
    }
    if (!method) {
      setErr(`Please select a withdrawal method.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/payments/withdraw`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({ originalAmount: amount, amount: numericAmount, method }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Withdrawal failed (${res.status})`);
      }

      setSuccessOpen(true);
      setAmount(``);
      setMethod(``);
    } catch (e: any) {
      setErr(e?.message ?? `Withdrawal failed.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Withdraw funds</h2>
      <p className="text-sm text-gray-600">Send money from your Remoola balance to your card or bank account.</p>

      <div>
        <label className="mb-1 block text-sm font-medium">Amount</label>
        <div className="relative">
          <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-gray-500">$</span>
          <input
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border px-7 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">Withdraw to</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setMethod(`CARD`)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
              method === `CARD`
                ? `border-blue-600 bg-blue-50 text-blue-700`
                : `border-gray-300 bg-white text-gray-800 hover:bg-gray-50`
            }`}
          >
            Card
          </button>
          <button
            type="button"
            onClick={() => setMethod(`BANK`)}
            className={`flex-1 rounded-lg border px-3 py-2 text-sm transition ${
              method === `BANK`
                ? `border-blue-600 bg-blue-50 text-blue-700`
                : `border-gray-300 bg-white text-gray-800 hover:bg-gray-50`
            }`}
          >
            Bank account
          </button>
        </div>
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium
        text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? `Processing…` : `Withdraw`}
      </button>

      <SuccessModal
        open={successOpen}
        title="Withdrawal created"
        description="Your withdrawal request has been submitted. You`ll see it in your transactions shortly."
        onCloseAction={() => setSuccessOpen(false)}
      />
    </form>
  );
}
