'use client';

import { useEffect, useState } from 'react';

import Link from 'next/link';

import { BalancesPanel } from './BalancesPanel';
import { ExchangeWidget } from './ExchangeWidget';
import styles from '../ui/classNames.module.css';

const { exchangePageContainer, exchangePageTitle, flexRowBetween, buttonSecondary } = styles;

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
      <div className={flexRowBetween}>
        <h1 className={exchangePageTitle}>Currency Exchange</h1>
        <div>
          <Link className={buttonSecondary} href="/exchange/rules">
            Auto rules
          </Link>
          {` `}
          <Link className={buttonSecondary} href="/exchange/scheduled">
            Scheduled
          </Link>
        </div>
      </div>
      <BalancesPanel balances={balances} />
      <ExchangeWidget balances={balances} />
    </div>
  );
}
