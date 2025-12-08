'use client';

import { useEffect, useState } from 'react';

import { TransferForm } from './TransferForm';
import { WithdrawForm } from './WithdrawForm';

type BalanceMap = Record<string, number>;

export function WithdrawTransferPageClient() {
  const [balances, setBalances] = useState<BalanceMap>({});

  useEffect(() => {
    const loadBalance = async () => {
      const res = await fetch(`/api/payments/balance`, {
        credentials: `include`,
      });
      if (!res.ok) return;

      const json = (await res.json()) as BalanceMap;
      setBalances(json);
    };

    loadBalance();
  }, []);

  const entries = Object.entries(balances);
  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold">Withdraw And Transfer</h1>

      {entries.length > 0 &&
        entries.map(([currency, amount]) => (
          <p key={currency} className="mb-2 text-sm text-gray-700">
            Available balance:{` `}
            <span className="font-semibold">
              {currency} {amount.toFixed(2)}
            </span>
          </p>
        ))}

      <div className="space-y-8">
        <WithdrawForm />
        <TransferForm />
      </div>
    </div>
  );
}
