'use client';

import { loadStripe } from '@stripe/stripe-js';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';

import { getErrorMessageForUser } from '../../../../lib/error-messages';
import { queryKeys } from '../../../../lib/hooks';
import { type IVerificationState } from '../../../../types';
import styles from '../../../ui/classNames.module.css';

const { primaryActionButton } = styles;

export interface VerifyMeButtonProps {
  verification?: IVerificationState | null;
}

function getButtonLabel(verification?: IVerificationState | null): string {
  if (!verification) return `Verify Me`;
  if (verification.effectiveVerified) return `Verified`;
  if (verification.profileComplete === false) return `Complete your profile`;
  switch (verification.status) {
    case `requires_input`:
    case `more_info`:
    case `rejected`:
      return `Retry verification`;
    case `pending_submission`:
      return `Continue verification`;
    default:
      return `Verify Me`;
  }
}

export function VerifyMeButton({ verification }: VerifyMeButtonProps) {
  const [loading, setLoading] = useState(false);
  const { mutate } = useSWRConfig();

  async function startVerification() {
    setLoading(true);
    try {
      const res = await fetch(`/api/stripe/verify/start`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const code = data?.message ?? data?.code ?? `Failed to start verification`;
        throw new Error(code);
      }

      const { clientSecret } = data;
      const stripe = await loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);

      const result = await stripe!.verifyIdentity(clientSecret);
      if (result?.error) {
        throw new Error(result.error.message);
      }

      toast.success(`Verification submitted`, {
        description: `We’ll update your dashboard after Stripe finishes processing your documents.`,
      });
      void mutate(queryKeys.dashboard.main());
    } catch (err) {
      const raw = err instanceof Error ? err.message : `Failed to start verification`;
      toast.error(getErrorMessageForUser(raw, `We couldn't start identity verification. Please try again.`));
    } finally {
      setLoading(false);
    }
  }

  if (verification?.profileComplete === false) {
    return (
      <Link
        href="/settings"
        className={primaryActionButton}
        style={{ textAlign: `center` }}
        data-testid="verify-me-button-complete-profile"
      >
        Complete your profile
      </Link>
    );
  }

  if (verification?.effectiveVerified) {
    return (
      <button disabled className={primaryActionButton} data-testid="verify-me-button">
        Verified
      </button>
    );
  }

  return (
    <button
      onClick={startVerification}
      disabled={loading || verification?.canStart === false}
      className={primaryActionButton}
      data-testid="verify-me-button"
    >
      {loading ? `Starting...` : getButtonLabel(verification)}
    </button>
  );
}
