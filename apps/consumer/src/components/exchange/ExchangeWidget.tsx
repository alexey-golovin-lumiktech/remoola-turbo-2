'use client';

import { useMemo, useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';

import { ALL_CURRENCY_CODES, type TCurrencyCode } from '@remoola/api-types';

import { RateDisplay } from './RateDisplay';
import { formatCurrencyAmount, roundToCurrency } from '../../lib/currency';
import { getErrorMessageForUser } from '../../lib/error-messages';
import { firstOtherCurrency, usePreferredCurrency } from '../../lib/hooks';
import { handleSessionExpired } from '../../lib/session-expired';
import { AmountCurrencyInput, FormSelect, type FormSelectOption } from '../ui';
import styles from '../ui/classNames.module.css';

const { exchangeAvailable, exchangeButton, exchangeCard, exchangeForm, exchangeRateText, exchangeResultText } = styles;

type ExchangeWidgetProps = { balances: Record<string, number> };

export function ExchangeWidget({ balances }: ExchangeWidgetProps) {
  const { preferredCurrency, loaded: settingsLoaded } = usePreferredCurrency();
  const [from, setFrom] = useState<TCurrencyCode>(ALL_CURRENCY_CODES[0]);
  const [to, setTo] = useState<TCurrencyCode>(ALL_CURRENCY_CODES[1]);
  const [amount, setAmount] = useState(``);
  const [rate, setRate] = useState<number | null>(null);
  const [result, setResult] = useState<number | null>(null);
  const [currencies, setCurrencies] = useState<string[]>([...ALL_CURRENCY_CODES]);
  const preferredAppliedRef = useRef(false);

  const available = balances[from] ?? 0;
  const amountValue = useMemo(() => Number(amount), [amount]);
  useEffect(() => {
    fetch(`/api/exchange/currencies`, { credentials: `include` })
      .then((res) => {
        if (res.status === 401) {
          handleSessionExpired();
          return null;
        }
        return res.ok ? res.json() : null;
      })
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
      setFrom((currencies[0] ?? ALL_CURRENCY_CODES[0]) as TCurrencyCode);
      setTo((currencies[1] ?? currencies[0] ?? ALL_CURRENCY_CODES[1]) as TCurrencyCode);
    }
  }, [currencies, from, to]);

  useEffect(() => {
    if (!settingsLoaded || !currencies.length || preferredAppliedRef.current) return;
    if (!preferredCurrency || !currencies.includes(preferredCurrency)) return;
    preferredAppliedRef.current = true;
    setFrom(preferredCurrency);
    setTo(firstOtherCurrency(currencies, preferredCurrency) as TCurrencyCode);
  }, [settingsLoaded, currencies, preferredCurrency]);

  useEffect(() => {
    if (!from || !to) return;
    fetch(`/api/exchange/rates?from=${from}&to=${to}`, { credentials: `include` })
      .then(async (res) => {
        if (res.status === 401) {
          handleSessionExpired();
          return;
        }
        if (!res.ok) {
          setRate(null);
          let msg = `Failed to fetch rate`;
          try {
            const body = (await res.json()) as { message?: string };
            msg = getErrorMessageForUser(body?.message, msg);
          } catch {
            // keep default msg
          }
          toast.error(msg);
          return;
        }
        const data = (await res.json()) as { rate?: number };
        setRate(typeof data?.rate === `number` ? data.rate : null);
      })
      .catch(() => {
        setRate(null);
        toast.error(`Failed to fetch rate`);
      });
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

    if (res.status === 401) {
      handleSessionExpired();
      return;
    }
    if (!res.ok) {
      toast.error(`Conversion failed`);
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
        <AmountCurrencyInput
          label={`Amount (${from})`}
          amount={amount}
          onAmountChange={setAmount}
          currencyCode={from}
          onCurrencyChange={setFrom}
          currencyOptions={currencies.map((c) => ({ value: c, label: c }))}
          placeholder="0.00"
        />
        <FormSelect
          label="To currency"
          value={to}
          onChange={(v) => setTo(v as TCurrencyCode)}
          options={currencies.map((c) => ({ value: c, label: c })) as FormSelectOption[]}
          placeholder="Select currency..."
          isClearable={false}
        />

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
