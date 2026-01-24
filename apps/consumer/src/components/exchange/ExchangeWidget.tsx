'use client';

import { useState, useEffect } from 'react';

import { RateDisplay } from './RateDisplay';
import styles from '../ui/classNames.module.css';

const {
  exchangeAvailable,
  exchangeButton,
  exchangeCard,
  exchangeField,
  exchangeForm,
  exchangeLabel,
  exchangeRateText,
  exchangeResultText,
} = styles;

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
    <div className={exchangeCard}>
      <div className={exchangeAvailable}>
        Available: {available.toFixed(2)} {from}
      </div>
      <RateDisplay from={from} to={to} />
      <div className={exchangeForm}>
        <div>
          <label className={exchangeLabel}>From currency</label>
          <select className={exchangeField} value={from} onChange={(e) => setFrom(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={exchangeLabel}>To currency</label>
          <select className={exchangeField} value={to} onChange={(e) => setTo(e.target.value)}>
            {CURRENCIES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={exchangeLabel}>Amount</label>
          <input
            className={exchangeField}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            type="number"
            min="0.01"
            step="0.01"
          />
        </div>

        {rate !== null && (
          <p className={exchangeRateText}>
            Rate: 1 {from} → {rate} {to}
          </p>
        )}

        {result !== null && (
          <p className={exchangeResultText}>
            You will receive: {result} {to}
          </p>
        )}

        <button onClick={convert} disabled={!amount || !rate} className={exchangeButton}>
          Convert
        </button>
      </div>
    </div>
  );
}
