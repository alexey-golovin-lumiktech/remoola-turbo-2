'use client';

import { useMemo, useState, useEffect } from 'react';

import { RateDisplay } from './RateDisplay';
import { formatCurrencyAmount, roundToCurrency } from '../../lib/currency';
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
  errorTextClass,
} = styles;

const CURRENCIES = [`USD`, `EUR`, `JPY`, `GBP`, `AUD`] as const;

type ExchangeWidgetProps = { balances: Record<string, number> };

export function ExchangeWidget({ balances }: ExchangeWidgetProps) {
  const [from, setFrom] = useState(`USD`);
  const [to, setTo] = useState(`EUR`);
  const [amount, setAmount] = useState(``);
  const [rate, setRate] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [currencies, setCurrencies] = useState<string[]>([...CURRENCIES]);
  const [rateError, setRateError] = useState<string | null>(null);
  const [convertError, setConvertError] = useState<string | null>(null);

  const available = balances[from] ?? 0;
  const amountValue = useMemo(() => Number(amount), [amount]);
  useEffect(() => {
    fetch(`/api/exchange/currencies`, { credentials: `include` })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data) && data.length) {
          setCurrencies(data);
        }
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!currencies.length) return;
    if (!currencies.includes(from) || !currencies.includes(to)) {
      setFrom(currencies[0] ?? `USD`);
      setTo(currencies[1] ?? currencies[0] ?? `EUR`);
    }
  }, [currencies, from, to]);

  useEffect(() => {
    if (from && to) {
      fetch(`/api/exchange/rates?from=${from}&to=${to}`)
        .then(async (res) => {
          if (!res.ok) {
            const message = await res.text();
            setRate(null);
            setRateError(message || `Failed to fetch rate`);
            return;
          }
          const data = await res.json();
          setRateError(null);
          setRate(data.rate);
        })
        .catch(() => {
          setRate(null);
          setRateError(`Failed to fetch rate`);
        });
    }
  }, [from, to]);

  useEffect(() => {
    if (rate && Number.isFinite(amountValue) && amountValue > 0) {
      setResult(roundToCurrency(amountValue * rate, to));
    } else {
      setResult(null);
    }
  }, [rate, amountValue, to]);

  async function convert() {
    setConvertError(null);
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

    if (!res.ok) {
      const message = await res.text();
      setConvertError(message || `Conversion failed`);
      return;
    }

    const json = await res.json();
    alert(`Converted! Received ${formatCurrencyAmount(json.targetAmount, json.to)} ${json.to}`);
  }

  return (
    <div className={exchangeCard}>
      <div className={exchangeAvailable}>
        Available: {formatCurrencyAmount(available, from)} {from}
      </div>
      <RateDisplay from={from} to={to} />
      <div className={exchangeForm}>
        <div>
          <label className={exchangeLabel}>From currency</label>
          <select className={exchangeField} value={from} onChange={(e) => setFrom(e.target.value)}>
            {currencies.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className={exchangeLabel}>To currency</label>
          <select className={exchangeField} value={to} onChange={(e) => setTo(e.target.value)}>
            {currencies.map((c) => (
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
            Rate: 1 {from} → {rate.toFixed(8)} {to}
          </p>
        )}

        {result !== null && (
          <p className={exchangeResultText}>
            You will receive: {formatCurrencyAmount(result, to)} {to}
          </p>
        )}

        {rateError && <p className={errorTextClass}>{rateError}</p>}
        {convertError && <p className={errorTextClass}>{convertError}</p>}

        <button onClick={convert} disabled={!amount || !rate} className={exchangeButton}>
          Convert
        </button>
      </div>
    </div>
  );
}
