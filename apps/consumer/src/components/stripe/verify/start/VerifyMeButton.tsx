'use client';

import { loadStripe } from '@stripe/stripe-js';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { getErrorMessageForUser } from '../../../../lib/error-messages';
import styles from '../../../ui/classNames.module.css';

const { primaryActionButton } = styles;

export interface VerifyMeButtonProps {
  /** When false, show "Complete your profile" and link to settings instead of starting verification */
  profileComplete?: boolean;
}

export function VerifyMeButton({ profileComplete = true }: VerifyMeButtonProps) {
  const [loading, setLoading] = useState(false);

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

      await stripe!.verifyIdentity(clientSecret);
    } catch (err) {
      const raw = err instanceof Error ? err.message : `Failed to start verification`;
      toast.error(getErrorMessageForUser(raw, `We couldn't start identity verification. Please try again.`));
    } finally {
      setLoading(false);
    }
  }

  if (profileComplete === false) {
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

  return (
    <button
      onClick={startVerification}
      disabled={loading}
      className={primaryActionButton}
      data-testid="verify-me-button"
    >
      {loading ? `Starting...` : `Verify Me`}
    </button>
  );
}
