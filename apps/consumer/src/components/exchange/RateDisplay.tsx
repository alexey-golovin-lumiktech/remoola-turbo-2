'use client';

import { useEffect, useState } from 'react';

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
    <div className="mt-2 rounded-lg bg-gray-50 dark:bg-slate-800 px-4 py-3 text-sm flex flex-col gap-1 border border-gray-200 dark:border-slate-700">
      {loading && <div className="text-gray-500 dark:text-gray-400 text-xs">Updating rate…</div>}

      {!loading && rate !== null && (
        <>
          <div className="flex items-center gap-2">
            <span className="font-semibold">1 {from}</span>

            <span className="text-gray-700 dark:text-gray-300">=</span>

            <span
              className={`font-semibold transition-all ${changed ? `text-green-600 dark:text-green-400 scale-[1.05]` : ``}`}
            >
              {rate} {to}
            </span>
          </div>

          <div className="text-xs text-gray-600 dark:text-gray-400">
            Inverse: 1 {to} = {(1 / rate).toFixed(4)} {from}
          </div>

          {changed && <div className="text-xs text-green-600 dark:text-green-400">Rate changed (was {prevRate})</div>}
        </>
      )}

      {!loading && rate === null && <div className="text-gray-500 dark:text-gray-400 text-xs">No rate available</div>}
    </div>
  );
}
