'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { pollForAuthCallbackSession } from './auth-callback-polling';
import { parseSearchParams } from '../../../features/auth/schemas';
import { getAuthErrorMessage } from '../../../lib/auth-error-messages';

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

    const redirectToLogin = () => {
      if (!cancelled) {
        router.replace(`/login`);
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
          const payload = (await exchangeResponse.json().catch(() => ({}))) as { code?: string; message?: string };
          router.replace(
            `/login?error=${encodeURIComponent(getAuthErrorMessage(payload.code ?? payload.message, `login_failed`))}`,
          );
          return;
        }

        const url = new URL(window.location.href);
        url.searchParams.delete(`oauthHandoff`);
        window.history.replaceState({}, ``, `${url.pathname}${url.search}${url.hash}`);
      }

      const sessionEstablished = await pollForAuthCallbackSession({
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
          } catch {
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
