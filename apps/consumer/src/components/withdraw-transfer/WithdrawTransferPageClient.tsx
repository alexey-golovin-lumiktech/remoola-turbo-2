'use client';

import { useCallback, useEffect, useState } from 'react';

import { TransferForm } from './TransferForm';
import { WithdrawForm } from './WithdrawForm';
import localStyles from './WithdrawTransferPageClient.module.css';
import { parseBalanceMapResponse, type BalanceMap } from '../../lib/payments-balance';
import { handleSessionExpired } from '../../lib/session-expired';
import { BalancesPanel } from '../exchange';

export function WithdrawTransferPageClient() {
  const [balances, setBalances] = useState<BalanceMap>({});
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadBalance = useCallback(async (signal?: AbortSignal) => {
    let isUnauthorized = false;

    setLoadError(null);
    setLoadingBalances(true);

    try {
      const res = await fetch(`/api/payments/balance`, {
        credentials: `include`,
        signal,
      });
      if (res.status === 401) {
        isUnauthorized = true;
        handleSessionExpired();
        return;
      }
      if (!res.ok) {
        setLoadError(`Failed to load balances`);
        return;
      }

      const json: unknown = await res.json();
      const parsed = parseBalanceMapResponse(json);

      if (parsed.parsed) {
        setBalances(parsed.balances);
      } else {
        setBalances({});
        setLoadError(`Failed to load balances`);
      }
    } catch (error) {
      if (signal?.aborted || (error instanceof DOMException && error.name === `AbortError`)) {
        return;
      }
      setBalances({});
      setLoadError(`Failed to load balances`);
    } finally {
      if (!signal?.aborted && !isUnauthorized) {
        setLoadingBalances(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadBalance(controller.signal);
    return () => controller.abort();
  }, [loadBalance]);

  return (
    <div className="space-y-6" data-testid="consumer-withdraw-transfer-page">
      <BalancesPanel
        balances={balances}
        loading={loadingBalances}
        error={loadError}
        onRetry={() => void loadBalance()}
      />
      <div className={localStyles.formsStack}>
        <WithdrawForm />
        <TransferForm />
      </div>
    </div>
  );
}
