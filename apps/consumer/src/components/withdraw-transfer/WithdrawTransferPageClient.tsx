'use client';

import { useEffect, useState } from 'react';

import { TransferForm } from './TransferForm';
import { WithdrawForm } from './WithdrawForm';
import localStyles from './WithdrawTransferPageClient.module.css';
import { handleSessionExpired } from '../../lib/session-expired';
import { BalancesPanel } from '../exchange';

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
    <div className="space-y-6" data-testid="consumer-withdraw-transfer-page">
      <BalancesPanel balances={balances} />
      <div className={localStyles.formsStack}>
        <WithdrawForm />
        <TransferForm />
      </div>
    </div>
  );
}
