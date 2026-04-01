'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import styles from './AuthCallback.module.css';
import { parseSearchParams } from '../../../features/auth/schemas';
import { clientLogger } from '../../../lib/logger';

const AUTH_CHECK_INTERVAL_MS = 500;
const AUTH_CHECK_TIMEOUT_MS = 10000;

export default function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const { nextPath: next } = parseSearchParams({ next: params.get(`next`) ?? undefined });
  const oauthToken = params.get(`oauthToken`);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const deadline = Date.now() + AUTH_CHECK_TIMEOUT_MS;

    const finish = (target: string) => {
      if (cancelled) return;
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
      router.replace(target);
    };

    const scheduleRetry = () => {
      if (cancelled) return;
      if (Date.now() >= deadline) {
        finish(`/login`);
        return;
      }
      timeoutId = setTimeout(() => {
        void run();
      }, AUTH_CHECK_INTERVAL_MS);
    };

    const run = async () => {
      try {
        if (oauthToken) {
          const exchangeRes = await fetch(`/api/oauth/exchange`, {
            method: `POST`,
            headers: { 'content-type': `application/json` },
            credentials: `include`,
            body: JSON.stringify({ exchangeToken: oauthToken }),
          });

          if (exchangeRes.ok) {
            const url = new URL(window.location.href);
            url.searchParams.delete(`oauthToken`);
            window.history.replaceState({}, ``, `${url.pathname}${url.search}${url.hash}`);
            finish(next);
            return;
          }
        } else {
          const res = await fetch(`/api/me`, { credentials: `include`, cache: `no-store` });
          if (res.ok) {
            finish(next);
            return;
          }
        }
      } catch (err) {
        clientLogger.warn(`Auth callback run failed`, { err });
      }

      scheduleRetry();
    };

    void run();
    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [router, next, oauthToken]);

  return (
    <div className={styles.wrapper} data-testid="auth-callback" role="status" aria-live="polite" aria-atomic="true">
      Redirecting…
    </div>
  );
}
