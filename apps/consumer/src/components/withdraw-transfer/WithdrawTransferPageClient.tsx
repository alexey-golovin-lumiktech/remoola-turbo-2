'use client';

import { useEffect, useState } from 'react';

import { TransferForm } from './TransferForm';
import { WithdrawForm } from './WithdrawForm';

type BalanceResponse = {
  available: number;
  currencyCode: string;
};

export function WithdrawTransferPageClient() {
  const [balance, setBalance] = useState<BalanceResponse | null>(null);

  useEffect(() => {
    const loadBalance = async () => {
      const res = await fetch(`/api/payments/balance`, {
        credentials: `include`,
      });
      if (!res.ok) return;
      const json = (await res.json()) as BalanceResponse;
      setBalance(json);
    };

    loadBalance();
  }, []);

  return (
    <div className="mx-auto max-w-2xl px-4 py-8">
      <h1 className="mb-2 text-2xl font-semibold">Withdraw &amp; Transfer</h1>

      {balance && (
        <p className="mb-4 text-sm text-gray-700">
          Available balance:{` `}
          <span className="font-semibold">
            {balance.currencyCode} {balance.available.toFixed(2)}
          </span>
        </p>
      )}

      <div className="space-y-8">
        <WithdrawForm />
        <TransferForm />
      </div>
    </div>
  );
}
