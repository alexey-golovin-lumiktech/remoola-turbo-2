'use client';

import { useState, useEffect } from 'react';

import { RateDisplay } from './RateDisplay';

const CURRENCIES = [`USD`, `EUR`, `JPY`, `GBP`, `AUD`] as const;

type ExchangeWidgetProps = { balances: Record<string, number> };

export function ExchangeWidget({ balances }: ExchangeWidgetProps) {
  const [from, setFrom] = useState(`USD`);
  const [to, setTo] = useState(`EUR`);
  const [amount, setAmount] = useState(``);
  const [rate, setRate] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);

  const available = balances[from] ?? 0;
  useEffect(() => {
    if (from && to) {
      fetch(`/api/exchange/rates?from=${from}&to=${to}`)
        .then((r) => r.json())
        .then((d) => setRate(d.rate));
    }
  }, [from, to]);

  useEffect(() => {
    if (rate && amount) {
      setResult(Number((Number(amount) * rate).toFixed(2)));
    } else {
      setResult(null);
    }
  }, [rate, amount]);

  async function convert() {
    const res = await fetch(`/api/exchange/convert`, {
      method: `POST`,
      credentials: `include`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({
        from,
        to,
        amount: Number(amount),
      }),
    });

    const json = await res.json();
    alert(`Converted! Received ${json.targetAmount} ${json.to}`);
  }

  return (
    <div className="rounded-xl border p-6 bg-white dark:bg-slate-800 shadow dark:border-slate-600">
      <div className="mb-2 text-sm text-gray-600">
        Available: {available.toFixed(2)} {from}
      </div>
      <RateDisplay from={from} to={to} />
      <div className="space-y-4">
        <div>
          <label>From currency</label>
          <select className="border rounded p-2 w-full" value={from} onChange={(e) => setFrom(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label>To currency</label>
          <select className="border rounded p-2 w-full" value={to} onChange={(e) => setTo(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label>Amount</label>
          <input
            className="border rounded p-2 w-full"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min="0.01"
            step="0.01"
          />
        </div>

        {rate !== null && (
          <p className="text-sm text-gray-500">
            Rate: 1 {from} → {rate} {to}
          </p>
        )}

        {result !== null && (
          <p className="text-sm font-semibold">
            You will receive: {result} {to}
          </p>
        )}

        <button
          onClick={convert}
          disabled={!amount || !rate}
          className="w-full bg-blue-600 p-2 rounded text-white hover:bg-blue-700 dark:hover:bg-blue-500 disabled:opacity-50"
        >
          Convert
        </button>
      </div>
    </div>
  );
}
