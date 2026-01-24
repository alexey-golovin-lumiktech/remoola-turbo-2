'use client';

import { useEffect, useState } from 'react';

import { BalancesPanel } from './BalancesPanel';
import { ExchangeWidget } from './ExchangeWidget';
import { exchangePageContainer, exchangePageTitle } from '../ui/classNames';

type BalanceMap = Record<string, number>;

export function ExchangePageClient() {
  const [balances, setBalances] = useState<BalanceMap>({});

  useEffect(() => {
    fetch(`/api/payments/balance`, { credentials: `include` })
      .then((res) => res.json())
      .then(setBalances);
  }, []);

  return (
    <div className={exchangePageContainer}>
      <h1 className={exchangePageTitle}>Currency Exchange</h1>
      <BalancesPanel balances={balances} />
      <ExchangeWidget balances={balances} />
    </div>
  );
}
