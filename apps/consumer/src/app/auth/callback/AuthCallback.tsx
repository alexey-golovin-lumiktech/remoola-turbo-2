'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import styles from '../../../components/ui/classNames.module.css';

const { authCallbackContainer } = styles;

export default function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get(`next`) || `/dashboard`;
  const oauthToken = params.get(`oauthToken`);

  useEffect(() => {
    let tries = 0;
    let inFlight = false;
    let exchangeComplete = oauthToken == null;

    const interval = setInterval(() => {
      tries++;
      if (inFlight) return;
      inFlight = true;

      const run = async () => {
        if (!exchangeComplete && oauthToken) {
          const exchangeRes = await fetch(`/api/oauth/exchange`, {
            method: `POST`,
            headers: { 'content-type': `application/json` },
            credentials: `include`,
            body: JSON.stringify({ exchangeToken: oauthToken }),
          });

          if (exchangeRes.ok) {
            exchangeComplete = true;
            const url = new URL(window.location.href);
            url.searchParams.delete(`oauthToken`);
            window.history.replaceState({}, ``, `${url.pathname}${url.search}${url.hash}`);
          }
        }

        if (exchangeComplete) {
          const res = await fetch(`/api/me`, { credentials: `include`, cache: `no-store` });
          if (res.ok) {
            clearInterval(interval);
            router.replace(next);
          }
        }
      };

      run()
        .catch(() => {
          // ignore transient network errors
        })
        .finally(() => {
          inFlight = false;
        });

      // Safety exit: if token didn't appear after 5 seconds
      if (tries > 50) {
        clearInterval(interval);
        router.replace(`/login`);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [router, next, oauthToken]);

  return <div className={authCallbackContainer}>Redirecting…</div>;
}
