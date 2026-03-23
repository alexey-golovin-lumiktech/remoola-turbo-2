'use client';

import { loadStripe } from '@stripe/stripe-js';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';

import styles from './VerificationCard.module.css';
import { getClientEnv } from '../../../lib/env.client';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { showErrorToast, showInfoToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { CheckIcon } from '../../../shared/ui/icons/CheckIcon';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';

type VerificationState = {
  status: string;
  canStart: boolean;
  profileComplete: boolean;
  legalVerified: boolean;
  effectiveVerified: boolean;
  reviewStatus: string;
  stripeStatus: string;
  sessionId: string | null;
  lastErrorCode: string | null;
  lastErrorReason: string | null;
  startedAt: string | null;
  updatedAt: string | null;
  verifiedAt: string | null;
};

interface VerificationCardProps {
  verification?: VerificationState | null;
  context?: `dashboard` | `settings`;
}

function getVerificationPresentation(verification?: VerificationState | null) {
  if (verification?.effectiveVerified) {
    return {
      title: `Identity verified`,
      description: `Your verification is complete and higher account limits are unlocked.`,
      buttonLabel: null,
      variant: `verified` as const,
    };
  }

  if (!verification?.profileComplete) {
    return {
      title: `Complete your profile first`,
      description: `Add the required profile details before starting identity verification.`,
      buttonLabel: `Complete profile`,
      variant: `profile` as const,
    };
  }

  switch (verification?.status) {
    case `requires_input`:
    case `more_info`:
      return {
        title: `Verification needs attention`,
        description: verification.lastErrorReason || `Retry verification to continue unlocking your account limits.`,
        buttonLabel: `Retry verification`,
        variant: `action` as const,
      };
    case `pending_submission`:
      return {
        title: `Finish your verification`,
        description: `Resume the Stripe verification flow and submit your documents to continue.`,
        buttonLabel: `Continue verification`,
        variant: `action` as const,
      };
    case `rejected`:
    case `flagged`:
      return {
        title: `Verification requires review`,
        description: verification.lastErrorReason || `Try verifying again or contact support if the issue persists.`,
        buttonLabel: `Retry verification`,
        variant: `action` as const,
      };
    default:
      return {
        title: `Verify your identity`,
        description: `Use Stripe Verify Me to unlock higher limits and complete your compliance setup.`,
        buttonLabel: `Verify me`,
        variant: `action` as const,
      };
  }
}

export function VerificationCard({ verification, context = `dashboard` }: VerificationCardProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const presentation = useMemo(() => getVerificationPresentation(verification), [verification]);

  async function startVerification() {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/stripe/verify/start`, {
        method: `POST`,
        headers: { 'content-type': `application/json` },
        credentials: `include`,
        cache: `no-store`,
      });

      const data = (await res.json().catch(() => ({}))) as {
        clientSecret?: string;
        code?: string;
        message?: string;
      };

      if (!res.ok || !data.clientSecret) {
        const code = data.code ?? data.message ?? `VERIFY_START_FAILED`;
        throw new Error(code);
      }

      const stripe = await loadStripe(getClientEnv().NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY);
      const result = await stripe?.verifyIdentity(data.clientSecret);
      if (result?.error) {
        showErrorToast(result.error.message ?? `We couldn't complete identity verification. Please try again.`, {
          code: result.error.code,
        });
        return;
      }

      showInfoToast(`Verification submitted`, {
        description: `We’ll refresh your status after Stripe finishes processing your documents.`,
      });
      router.refresh();
    } catch (err) {
      const raw = err instanceof Error ? err.message : `Failed to start verification`;
      showErrorToast(getErrorMessageForUser(raw, getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR)), {
        code: raw,
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section
      className={styles.card}
      data-context={context}
      data-state={presentation.variant}
      data-testid="verify-me-card"
    >
      <div className={styles.header}>
        <div className={presentation.variant === `verified` ? styles.iconVerified : styles.icon}>
          {presentation.variant === `verified` ? (
            <CheckIcon className={styles.iconSvg} />
          ) : (
            <DocumentIcon className={styles.iconSvg} />
          )}
        </div>
        <div className={styles.headerText}>
          <div className={styles.kicker}>Stripe Verify Me</div>
          <h3 className={styles.title}>{presentation.title}</h3>
        </div>
        <span className={presentation.variant === `verified` ? styles.badgeVerified : styles.badge}>
          {verification?.effectiveVerified ? `Verified` : `Recommended`}
        </span>
      </div>

      <p className={styles.description}>{presentation.description}</p>

      {verification?.reviewStatus && verification.reviewStatus !== `PENDING` ? (
        <p className={styles.meta}>Review status: {verification.reviewStatus.replaceAll(`_`, ` `).toLowerCase()}</p>
      ) : null}

      {presentation.buttonLabel === null ? null : verification?.profileComplete === false ? (
        <Link href="/settings" className={styles.linkButton} data-testid="verify-me-complete-profile">
          {presentation.buttonLabel}
        </Link>
      ) : (
        <Button
          type="button"
          variant="primary"
          size="md"
          isLoading={isLoading}
          disabled={!verification?.canStart}
          className={styles.button}
          onClick={startVerification}
        >
          {presentation.buttonLabel}
        </Button>
      )}
    </section>
  );
}
