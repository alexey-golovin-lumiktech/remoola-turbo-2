'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { BalancesPanel } from './BalancesPanel';
import localStyles from './ExchangePageClient.module.css';
import { ExchangeWidget } from './ExchangeWidget';
import { handleSessionExpired } from '../../lib/session-expired';

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
    <div className="space-y-5">
      <div className={localStyles.navLinks}>
        <Link className={localStyles.navLink} href="/exchange/rules">
          Auto-Conversion Rules
        </Link>
        <Link className={localStyles.navLink} href="/exchange/scheduled">
          Scheduled Conversions
        </Link>
      </div>
      <BalancesPanel balances={balances} />
      <ExchangeWidget balances={balances} />
    </div>
  );
}
