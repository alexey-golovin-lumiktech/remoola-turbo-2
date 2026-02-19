'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

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
  const [error, setError] = useState<string | null>(null);
  const lastRateRef = useRef<number | null>(null);

  useEffect(() => {
    if (!from || !to) return;

    setLoading(true);

    fetch(`/api/exchange/rates?from=${from}&to=${to}`, {
      credentials: `include`,
    })
      .then(async (res) => {
        if (!res.ok) {
          const message = await res.text();
          setRate(null);
          const msg = message || `Failed to fetch rate`;
          setError(msg);
          toast.error(msg);
          return;
        }
        const data = await res.json();
        if (lastRateRef.current !== null) {
          setPrevRate(lastRateRef.current);
        }
        setRate(data.rate);
        lastRateRef.current = data.rate;
        setError(null);
      })
      .catch(() => {
        setRate(null);
        const msg = `Failed to fetch rate`;
        setError(msg);
        toast.error(msg);
      })
      .finally(() => setLoading(false));
  }, [from, to]);

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
              {rate.toFixed(8)} {to}
            </span>
          </div>

          <div className={rateInverse}>
            Inverse: 1 {to} = {(1 / rate).toFixed(6)} {from}
          </div>

          {changed && <div className={rateChangedText}>Rate changed (was {prevRate})</div>}
        </>
      )}

      {!loading && rate === null && !error && <div className={rateEmpty}>No rate available</div>}
    </div>
  );
}
