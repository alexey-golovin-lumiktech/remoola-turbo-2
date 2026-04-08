'use client';

import { loadStripe } from '@stripe/stripe-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import { type DashboardVerificationState, getVerificationBannerAction } from './verification-banner';
import { startVerificationSessionMutation } from '../../../lib/consumer-mutations.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { SpinnerIcon } from '../../../shared/ui/icons/SpinnerIcon';

type Props = {
  verification: DashboardVerificationState | undefined;
  dashboardUnavailable: boolean;
};

function getFallbackErrorMessage(actionLabel: string) {
  switch (actionLabel) {
    case `Continue verification`:
      return `We couldn't continue verification right now. Please try again.`;
    case `Restart verification`:
      return `We couldn't restart verification right now. Please try again.`;
    case `Retry verification`:
      return `We couldn't retry verification right now. Please try again.`;
    default:
      return `We couldn't start verification right now. Please try again.`;
  }
}

export function DashboardVerificationAction({ verification, dashboardUnavailable }: Props) {
  const router = useRouter();
  const action = useMemo(
    () => getVerificationBannerAction(verification, dashboardUnavailable),
    [dashboardUnavailable, verification],
  );
  const buttonAction = action?.kind === `button` ? action : null;
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: `error` | `success`; text: string } | null>(null);

  if (!action) {
    return null;
  }

  async function handleStartVerification() {
    if (!buttonAction) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const result = await startVerificationSessionMutation();
      if (!result.ok) {
        if (handleSessionExpiredError(result.error)) return;
        setMessage({ type: `error`, text: result.error.message });
        return;
      }

      if (result.data.url) {
        window.location.assign(result.data.url);
        return;
      }

      if (!result.data.clientSecret) {
        setMessage({
          type: `error`,
          text: `Verification could not be opened because the session response was incomplete.`,
        });
        return;
      }

      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        setMessage({
          type: `error`,
          text: `Verification is unavailable because the Stripe publishable key is not configured.`,
        });
        return;
      }

      const stripe = await loadStripe(publishableKey);
      if (!stripe) {
        setMessage({
          type: `error`,
          text: `Verification is unavailable because Stripe could not be loaded.`,
        });
        return;
      }

      const verificationResult = await stripe.verifyIdentity(result.data.clientSecret);
      if (verificationResult?.error) {
        setMessage({
          type: `error`,
          text: verificationResult.error.message ?? getFallbackErrorMessage(buttonAction.label),
        });
        return;
      }

      setMessage({
        type: `success`,
        text: `Verification submitted. Refreshing your dashboard status...`,
      });
      router.refresh();
    } catch {
      setMessage({
        type: `error`,
        text: getFallbackErrorMessage(buttonAction.label),
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex w-full max-w-sm flex-col gap-3 md:items-end">
      {action.kind === `link` ? (
        <Link
          href={action.href}
          className="inline-flex w-full items-center justify-center rounded-full bg-[var(--app-primary)] px-4 py-2.5 text-sm font-medium text-[var(--app-primary-contrast)] transition hover:opacity-90 md:w-auto"
        >
          {action.label}
        </Link>
      ) : (
        <button
          type="button"
          onClick={handleStartVerification}
          disabled={isLoading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[var(--app-primary)] px-4 py-2.5 text-sm font-medium text-[var(--app-primary-contrast)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-70 md:w-auto"
        >
          {isLoading ? <SpinnerIcon size={16} className="animate-spin" /> : null}
          {isLoading ? `Opening verification...` : action.label}
        </button>
      )}

      {message ? (
        <div
          className={`rounded-2xl border px-4 py-3 text-sm leading-6 ${
            message.type === `error`
              ? `border-transparent bg-[var(--app-danger-soft)] text-[var(--app-danger-text)]`
              : `border-transparent bg-[var(--app-success-soft)] text-[var(--app-success-text)]`
          }`}
        >
          {message.text}
        </div>
      ) : null}
    </div>
  );
}
