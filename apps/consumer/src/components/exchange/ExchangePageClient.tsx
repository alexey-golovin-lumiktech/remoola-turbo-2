'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { BalancesPanel } from './BalancesPanel';
import localStyles from './ExchangePageClient.module.css';
import { ExchangeWidget } from './ExchangeWidget';
import { parseBalanceMapResponse, type BalanceMap } from '../../lib/payments-balance';
import { handleSessionExpired } from '../../lib/session-expired';

export function ExchangePageClient() {
  const [balances, setBalances] = useState<BalanceMap>({});
  const [loadingBalances, setLoadingBalances] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadBalances = useCallback(async (signal?: AbortSignal) => {
    let isUnauthorized = false;

    setLoadError(null);
    setLoadingBalances(true);

    try {
      const res = await fetch(`/api/payments/balance`, { credentials: `include`, signal });
      if (res.status === 401) {
        isUnauthorized = true;
        handleSessionExpired();
        return;
      }
      if (!res.ok) {
        setLoadError(`Failed to load balances`);
        return;
      }

      const data: unknown = await res.json();
      const parsed = parseBalanceMapResponse(data);

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
    void loadBalances(controller.signal);
    return () => controller.abort();
  }, [loadBalances]);

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
      <BalancesPanel
        balances={balances}
        loading={loadingBalances}
        error={loadError}
        onRetry={() => void loadBalances()}
      />
      <ExchangeWidget balances={balances} />
    </div>
  );
}
