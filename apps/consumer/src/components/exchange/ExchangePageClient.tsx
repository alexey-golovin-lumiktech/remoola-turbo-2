'use client';

import { useEffect, useState } from 'react';

import { BalancesPanel } from './BalancesPanel';
import { ExchangeWidget } from './ExchangeWidget';

type BalanceMap = Record<string, number>;

export function ExchangePageClient() {
  const [balances, setBalances] = useState<BalanceMap>({});

  useEffect(() => {
    fetch(`/api/payments/balance`, { credentials: `include` })
      .then((res) => res.json())
      .then(setBalances);
  }, []);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="text-2xl font-bold mb-6">Currency Exchange</h1>
      <BalancesPanel balances={balances} />
      <ExchangeWidget balances={balances} />
    </div>
  );
}
