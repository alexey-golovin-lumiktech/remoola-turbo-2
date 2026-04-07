'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { pollForAuthCallbackSession } from './auth-callback-polling';
import { parseSearchParams } from '../../../features/auth/schemas';
const TOO_MANY_LOGIN_ATTEMPTS_CODE = `TOO_MANY_LOGIN_ATTEMPTS`;
const AUTH_CALLBACK_FALLBACK_ERROR = `Sign-in failed. Please try again.`;

export function AuthCallbackPageClient({
  nextParam,
  oauthHandoff,
}: {
  nextParam?: string;
  oauthHandoff: string | null;
}) {
  const router = useRouter();
  const { nextPath } = parseSearchParams({ next: nextParam });

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;
    let resolvePendingSleep: (() => void) | null = null;

    const redirectToLogin = (error?: string) => {
      if (!cancelled) {
        const loginUrl = error ? `/login?error=${encodeURIComponent(error)}` : `/login`;
        router.replace(loginUrl);
      }
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
          redirectToLogin(payload.code ?? payload.message ?? AUTH_CALLBACK_FALLBACK_ERROR);
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
                router.replace(nextPath);
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
  }, [nextPath, oauthHandoff, router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-sm text-slate-500 dark:text-slate-400">
      Finishing sign-in...
    </div>
  );
}
