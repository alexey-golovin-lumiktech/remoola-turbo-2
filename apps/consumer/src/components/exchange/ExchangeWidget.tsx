'use client';

import { useMemo, useState, useEffect } from 'react';
import { toast } from 'sonner';

import { formatCurrencyAmount, roundToCurrency } from '../../lib/currency';
import { formatMonetaryDisplay, maskMonetary } from '../../lib/monetary';
import { FormField, FormSelect, type FormSelectOption } from '../ui';
import { RateDisplay } from './RateDisplay';
import styles from '../ui/classNames.module.css';

const {
  exchangeAvailable,
  exchangeButton,
  exchangeCard,
  exchangeForm,
  exchangeRateText,
  exchangeResultText,
  formFieldSpacing,
} = styles;

const CURRENCIES = [`USD`, `EUR`, `JPY`, `GBP`, `AUD`] as const;

type ExchangeWidgetProps = { balances: Record<string, number> };

export function ExchangeWidget({ balances }: ExchangeWidgetProps) {
  const [from, setFrom] = useState(`USD`);
  const [to, setTo] = useState(`EUR`);
  const [amount, setAmount] = useState(``);
  const [amountFocused, setAmountFocused] = useState(false);
  const [rate, setRate] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [currencies, setCurrencies] = useState<string[]>([...CURRENCIES]);

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
            toast.error(message || `Failed to fetch rate`);
            return;
          }
          const data = await res.json();
          setRate(data.rate);
        })
        .catch(() => {
          setRate(null);
          toast.error(`Failed to fetch rate`);
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
      toast.error(message || `Conversion failed`);
      return;
    }

    const json = await res.json();
    toast.success(`Converted! Received ${formatCurrencyAmount(json.targetAmount, json.to)} ${json.to}`);
  }

  return (
    <div className={exchangeCard}>
      <div className={exchangeAvailable}>
        Available: {formatCurrencyAmount(available, from)} {from}
      </div>
      <RateDisplay from={from} to={to} />
      <div className={exchangeForm}>
        <FormSelect
          label="From currency"
          value={from}
          onChange={setFrom}
          options={currencies.map((c) => ({ value: c, label: c })) as FormSelectOption[]}
          placeholder="Select currency..."
          isClearable={false}
        />
        <FormSelect
          label="To currency"
          value={to}
          onChange={setTo}
          options={currencies.map((c) => ({ value: c, label: c })) as FormSelectOption[]}
          placeholder="Select currency..."
          isClearable={false}
        />

        <FormField label={`Amount (${from})`}>
          <input
            type="text"
            inputMode="decimal"
            className={formFieldSpacing}
            value={amountFocused ? amount : formatMonetaryDisplay(amount)}
            onFocus={() => setAmountFocused(true)}
            onBlur={() => setAmountFocused(false)}
            onChange={(e) => setAmount(maskMonetary(e.target.value))}
            placeholder="0.00"
          />
        </FormField>

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

        <button onClick={convert} disabled={!amount || !rate} className={exchangeButton}>
          Convert
        </button>
      </div>
    </div>
  );
}
