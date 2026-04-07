'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect } from 'react';

import { sanitizeNextForRedirect } from '@remoola/api-types';

import { pollForAuthCallbackSession } from './auth-callback-polling';
import styles from '../../../components/ui/classNames.module.css';
import { getAuthErrorMessage } from '../../../lib/auth-error-messages';

const { authCallbackContainer } = styles;
const DEFAULT_NEXT_PATH = `/dashboard`;
const TOO_MANY_LOGIN_ATTEMPTS_CODE = `TOO_MANY_LOGIN_ATTEMPTS`;
const AUTH_CALLBACK_FALLBACK_ERROR = `Sign-in failed. Please try again.`;

export default function AuthCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const next = sanitizeNextForRedirect(params.get(`next`), DEFAULT_NEXT_PATH);
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
      if (oauthHandoff) {
        const exchangeResponse = await fetch(`/api/oauth/complete`, {
          method: `POST`,
          headers: { 'content-type': `application/json` },
          credentials: `include`,
          body: JSON.stringify({ handoffToken: oauthHandoff }),
          cache: `no-store`,
        });

        if (!exchangeResponse.ok) {
          if (exchangeResponse.status === 429) {
            redirectToLogin(TOO_MANY_LOGIN_ATTEMPTS_CODE);
            return;
          }
          const payload = (await exchangeResponse.json().catch(() => ({}))) as { code?: string; message?: string };
          redirectToLogin(getAuthErrorMessage(payload.code ?? payload.message, AUTH_CALLBACK_FALLBACK_ERROR));
          return;
        }

        const url = new URL(window.location.href);
        url.searchParams.delete(`oauthHandoff`);
        window.history.replaceState({}, ``, `${url.pathname}${url.search}${url.hash}`);
      }

      let sessionEstablished = false;
      try {
        sessionEstablished = await pollForAuthCallbackSession({
          poll: async () => {
            if (cancelled) return false;

            try {
              const meResponse = await fetch(`/api/me`, {
                credentials: `include`,
                cache: `no-store`,
              });

              if (meResponse.ok) {
                router.replace(next);
                return true;
              }

              if (meResponse.status === 429) {
                throw new Error(TOO_MANY_LOGIN_ATTEMPTS_CODE);
              }
            } catch (error) {
              if (error instanceof Error && error.message === TOO_MANY_LOGIN_ATTEMPTS_CODE) {
                throw error;
              }
              // Keep the retry path bounded; transient network errors should behave like a miss.
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
      } catch (error) {
        if (error instanceof Error && error.message === TOO_MANY_LOGIN_ATTEMPTS_CODE) {
          redirectToLogin(TOO_MANY_LOGIN_ATTEMPTS_CODE);
          return;
        }
        throw error;
      }

      if (!sessionEstablished) {
        redirectToLogin();
      }
    };

    void completeAuthCallback().catch(() => {
      redirectToLogin();
    });

    return () => {
      cancelled = true;
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
        resolvePendingSleep?.();
      }
    };
  }, [router, next, oauthHandoff]);

  return (
    <div className={authCallbackContainer} role="status" aria-live="polite" aria-atomic="true">
      Completing sign-in...
    </div>
  );
}
