'use client';

import { useState } from 'react';

import { SuccessModal } from './SuccessModal';

export function TransferForm() {
  const [amount, setAmount] = useState(``);
  const [recipient, setRecipient] = useState(``);
  const [note, setNote] = useState(``);
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
    if (!recipient.trim()) {
      setErr(`Please enter recipient email.`);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/payments/transfer`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        body: JSON.stringify({ amount: numericAmount, recipient: recipient.trim(), note: note || null }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Transfer failed (${res.status})`);
      }

      setSuccessOpen(true);
      setAmount(``);
      setRecipient(``);
      setNote(``);
    } catch (e: any) {
      setErr(e?.message ?? `Transfer failed.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 rounded-xl border bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold">Transfer to another person</h2>
      <p className="text-sm text-gray-600">Send money to another Remoola user using their email number.</p>

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
        <label className="mb-1 block text-sm font-medium">Recipient (email)</label>
        <input
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="example@email.com or +1 234 567 890"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium">
          Note <span className="text-gray-400">(optional)</span>
        </label>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          placeholder="What is this transfer for?"
        />
      </div>

      {err && <p className="text-sm text-red-600">{err}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full rounded-lg bg-blue-600 py-2 text-sm font-medium
        text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading ? `Processing…` : `Send transfer`}
      </button>

      <SuccessModal
        open={successOpen}
        title="Transfer sent"
        description="Your transfer has been sent successfully."
        onCloseAction={() => setSuccessOpen(false)}
      />
    </form>
  );
}
