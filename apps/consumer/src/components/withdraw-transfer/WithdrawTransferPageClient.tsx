'use client';

import { useEffect, useState } from 'react';

import { TransferForm } from './TransferForm';
import { WithdrawForm } from './WithdrawForm';
import { handleSessionExpired } from '../../lib/session-expired';
import { BalancesPanel } from '../exchange';
import styles from '../ui/classNames.module.css';

const { spaceY8, withdrawTransferContainer, withdrawTransferTitle } = styles;

type BalanceMap = Record<string, number>;

export function WithdrawTransferPageClient() {
  const [balances, setBalances] = useState<BalanceMap>({});

  useEffect(() => {
    const loadBalance = async () => {
      const res = await fetch(`/api/payments/balance`, {
        credentials: `include`,
      });
      if (res.status === 401) {
        handleSessionExpired();
        return;
      }
      if (!res.ok) return;

      const json = (await res.json()) as BalanceMap;
      setBalances(json);
    };

    loadBalance();
  }, []);

  return (
    <div className={withdrawTransferContainer} data-testid="consumer-withdraw-transfer-page">
      <h1 className={withdrawTransferTitle}>Withdraw And Transfer</h1>
      <BalancesPanel balances={balances} />
      <div className={spaceY8}>
        <WithdrawForm />
        <TransferForm />
      </div>
    </div>
  );
}
