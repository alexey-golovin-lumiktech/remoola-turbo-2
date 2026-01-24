'use client';

import { useEffect, useState } from 'react';

import styles from '../ui/classNames.module.css';

const {
  rateCard,
  rateChangedText,
  rateEmpty,
  rateEquals,
  rateFrom,
  rateInverse,
  rateLoading,
  rateRow,
  rateValue,
  rateValueChanged,
} = styles;

type RateDisplayProps = {
  from: string; // CurrencyCode
  to: string; // CurrencyCode
};

export function RateDisplay({ from, to }: RateDisplayProps) {
  const [rate, setRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [prevRate, setPrevRate] = useState<number | null>(null);

  useEffect(() => {
    if (!from || !to) return;

    setLoading(true);

    fetch(`/api/exchange/rates?from=${from}&to=${to}`, {
      credentials: `include`,
    })
      .then((res) => res.json())
      .then((data) => {
        if (rate !== null) setPrevRate(rate);
        setRate(data.rate);
      })
      .finally(() => setLoading(false));
  }, [from, to, rate]);

  const changed = prevRate !== null && rate !== null && prevRate !== rate;

  return (
    <div className={rateCard}>
      {loading && <div className={rateLoading}>Updating rate…</div>}

      {!loading && rate !== null && (
        <>
          <div className={rateRow}>
            <span className={rateFrom}>1 {from}</span>

            <span className={rateEquals}>=</span>

            <span className={`${rateValue} ${changed ? rateValueChanged : ``}`}>
              {rate} {to}
            </span>
          </div>

          <div className={rateInverse}>
            Inverse: 1 {to} = {(1 / rate).toFixed(4)} {from}
          </div>

          {changed && <div className={rateChangedText}>Rate changed (was {prevRate})</div>}
        </>
      )}

      {!loading && rate === null && <div className={rateEmpty}>No rate available</div>}
    </div>
  );
}
