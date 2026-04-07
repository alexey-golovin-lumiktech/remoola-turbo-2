'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { pollForAuthCallbackSession } from './auth-callback-polling';
import styles from './AuthCallback.module.css';
import { parseSearchParams } from '../../../features/auth/schemas';
import { getAuthErrorMessage } from '../../../lib/auth-error-messages';
import { clientLogger } from '../../../lib/logger';

const TOO_MANY_LOGIN_ATTEMPTS_CODE = `TOO_MANY_LOGIN_ATTEMPTS`;
const AUTH_CALLBACK_FALLBACK_ERROR = `Sign-in failed. Please try again.`;

export default function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const { nextPath: next } = parseSearchParams({ next: params.get(`next`) ?? undefined });
  const oauthHandoff = params.get(`oauthHandoff`);

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;
    let resolvePendingSleep: (() => void) | null = null;

    const redirectToLogin = (error?: string) => {
      if (cancelled) return;
      const loginUrl = error ? `/login?error=${encodeURIComponent(error)}` : `/login`;
      router.replace(loginUrl);
    };

    const completeAuthCallback = async () => {
      try {
        if (oauthHandoff) {
          const exchangeRes = await fetch(`/api/oauth/complete`, {
            method: `POST`,
            headers: { 'content-type': `application/json` },
            credentials: `include`,
            body: JSON.stringify({ handoffToken: oauthHandoff }),
            cache: `no-store`,
          });

          if (!exchangeRes.ok) {
            if (exchangeRes.status === 429) {
              redirectToLogin(TOO_MANY_LOGIN_ATTEMPTS_CODE);
              return;
            }
            const payload = (await exchangeRes.json().catch(() => ({}))) as { code?: string; message?: string };
            redirectToLogin(getAuthErrorMessage(payload.code ?? payload.message, AUTH_CALLBACK_FALLBACK_ERROR));
            return;
          }

          const url = new URL(window.location.href);
          url.searchParams.delete(`oauthHandoff`);
          window.history.replaceState({}, ``, `${url.pathname}${url.search}${url.hash}`);
        }
      } catch (err) {
        clientLogger.warn(`Auth callback exchange failed`, { err });
        redirectToLogin();
        return;
      }

      let sessionEstablished = false;
      try {
        sessionEstablished = await pollForAuthCallbackSession({
          poll: async () => {
            if (cancelled) return false;

            try {
              const res = await fetch(`/api/me`, { credentials: `include`, cache: `no-store` });
              if (res.ok) {
                router.replace(next);
                return true;
              }
              if (res.status === 429) {
                throw new Error(TOO_MANY_LOGIN_ATTEMPTS_CODE);
              }
            } catch (err) {
              if (err instanceof Error && err.message === TOO_MANY_LOGIN_ATTEMPTS_CODE) {
                throw err;
              }
              clientLogger.warn(`Auth callback session poll failed`, { err });
            }

            return false;
          },
          sleep: (delayMs) =>
            new Promise((resolve) => {
              if (cancelled) {
                resolve();
                return;
              }

              resolvePendingSleep = () => {
                resolvePendingSleep = null;
                timeoutId = null;
                resolve();
              };

              timeoutId = window.setTimeout(() => {
                resolvePendingSleep?.();
              }, delayMs);
            }),
          isCancelled: () => cancelled,
        });
      } catch (err) {
        if (err instanceof Error && err.message === TOO_MANY_LOGIN_ATTEMPTS_CODE) {
          redirectToLogin(TOO_MANY_LOGIN_ATTEMPTS_CODE);
          return;
        }
        throw err;
      }

      if (!sessionEstablished) {
        redirectToLogin();
      }
    };

    void completeAuthCallback();
    return () => {
      cancelled = true;
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
        resolvePendingSleep?.();
      }
    };
  }, [router, next, oauthHandoff]);

  return (
    <div className={styles.wrapper} data-testid="auth-callback" role="status" aria-live="polite" aria-atomic="true">
      Redirecting…
    </div>
  );
}
