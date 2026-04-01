'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

import { AUTH_CALLBACK_MAX_SESSION_POLLS, getAuthCallbackSessionPollDelayMs } from './auth-callback-polling';
import { parseSearchParams } from '../../../features/auth/schemas';
import { getAuthErrorMessage } from '../../../lib/auth-error-messages';

export function AuthCallbackPageClient({ nextParam, oauthToken }: { nextParam?: string; oauthToken: string | null }) {
  const router = useRouter();
  const { nextPath } = parseSearchParams({ next: nextParam });

  useEffect(() => {
    let cancelled = false;
    let timeoutId: number | null = null;

    const redirectToLogin = () => {
      if (!cancelled) {
        router.replace(`/login`);
      }
    };

    const pollSession = async (attempt: number): Promise<void> => {
      if (cancelled) return;

      try {
        const meResponse = await fetch(`/api/me`, {
          credentials: `include`,
          cache: `no-store`,
        });

        if (meResponse.ok) {
          router.replace(nextPath);
          return;
        }
      } catch {
        // Keep the retry path bounded; transient network errors should behave like a miss.
      }

      if (attempt >= AUTH_CALLBACK_MAX_SESSION_POLLS - 1) {
        redirectToLogin();
        return;
      }

      timeoutId = window.setTimeout(() => {
        void pollSession(attempt + 1);
      }, getAuthCallbackSessionPollDelayMs(attempt));
    };

    const run = async () => {
      if (oauthToken) {
        const exchangeResponse = await fetch(`/api/oauth/exchange`, {
          method: `POST`,
          headers: { 'content-type': `application/json` },
          credentials: `include`,
          body: JSON.stringify({ exchangeToken: oauthToken }),
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
        url.searchParams.delete(`oauthToken`);
        window.history.replaceState({}, ``, `${url.pathname}${url.search}${url.hash}`);
      }

      await pollSession(0);
    };

    void run().catch(() => {
      redirectToLogin();
    });

    return () => {
      cancelled = true;
      if (timeoutId != null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [nextPath, oauthToken, router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 text-sm text-slate-500 dark:text-slate-400">
      Finishing sign-in...
    </div>
  );
}
