'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { BalancesPanel } from './BalancesPanel';
import { ExchangeWidget } from './ExchangeWidget';
import { handleSessionExpired } from '../../lib/session-expired';
import styles from '../ui/classNames.module.css';

const { exchangePageContainer, exchangePageTitle, flexRowBetween, buttonSecondary } = styles;

type BalanceMap = Record<string, number>;

function isBalanceMap(x: unknown): x is BalanceMap {
  if (typeof x !== `object` || x === null || Array.isArray(x)) return false;
  return Object.values(x).every((v) => typeof v === `number`);
}

export function ExchangePageClient() {
  const [balances, setBalances] = useState<BalanceMap>({});

  useEffect(() => {
    fetch(`/api/payments/balance`, { credentials: `include` })
      .then((res) => {
        if (res.status === 401) {
          handleSessionExpired();
          return null;
        }
        return res.ok ? res.json() : null;
      })
      .then((data: unknown) => {
        if (isBalanceMap(data)) {
          setBalances(data);
        }
      });
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
