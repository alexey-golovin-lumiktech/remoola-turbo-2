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

const {
  verifyCard,
  verifyCardVerified,
  verifyCardPending,
  verifyCardRejected,
  verifyCardProfileIncomplete,
  verifyCardIcon,
  verifyCardIconVerified,
  verifyCardIconPending,
  verifyCardIconRejected,
  verifyCardIconDefault,
  verifyCardBody,
  verifyCardTitle,
  verifyCardDescription,
  verifyCardMeta,
  verifyCardMetaItem,
  verifyCardActions,
  verifyCardPrimaryBtn,
  verifyCardPrimaryBtnLoading,
  verifyCardPrimaryBtnDisabled,
  verifyCardSecondaryBtn,
  verifyCardBadge,
  verifyCardBadgeVerified,
  verifyCardBadgePending,
  verifyCardBadgeRejected,
  verifyCardBadgeDefault,
  verifyCardSpinner,
} = styles;

export interface VerifyMeCardProps {
  verification?: IVerificationState | null;
}

type CardVariant = 'default' | 'verified' | 'pending' | 'rejected' | 'profile_incomplete';

function getVariant(verification?: IVerificationState | null): CardVariant {
  if (!verification) return 'default';
  if (verification.effectiveVerified) return 'verified';
  if (verification.profileComplete === false) return 'profile_incomplete';
  switch (verification.status) {
    case 'requires_input':
    case 'more_info':
    case 'rejected':
      return 'rejected';
    case 'pending_submission':
    case 'pending':
      return 'pending';
    default:
      return 'default';
  }
}

interface VariantContent {
  icon: string;
  title: string;
  description: string;
  badge: string;
}

function getContent(variant: CardVariant, verification?: IVerificationState | null): VariantContent {
  switch (variant) {
    case 'verified':
      return {
        icon: '✓',
        title: 'Identity Verified',
        description: 'Your identity has been confirmed. You have full access to all platform features.',
        badge: 'Verified',
      };
    case 'pending':
      return {
        icon: '⏳',
        title: 'Verification In Progress',
        description: "We're reviewing your submitted documents. This usually takes a few minutes.",
        badge: 'Under Review',
      };
    case 'rejected': {
      const reason = verification?.lastErrorReason;
      return {
        icon: '!',
        title: 'Verification Needs Attention',
        description: reason
          ? `Your verification was not accepted: ${reason}. Please retry with valid documents.`
          : 'Your previous verification attempt was unsuccessful. Please retry with valid documents.',
        badge: 'Action Required',
      };
    }
    case 'profile_incomplete':
      return {
        icon: '○',
        title: 'Complete Your Profile First',
        description: 'Before verifying your identity, please fill in your personal details in Settings.',
        badge: 'Profile Incomplete',
      };
    default:
      return {
        icon: '◇',
        title: 'Verify Your Identity',
        description:
          'Confirm your identity with a government-issued ID to unlock full access — including payments and withdrawals.',
        badge: 'Not Started',
      };
  }
}

function getButtonLabel(variant: CardVariant, loading: boolean): string {
  if (loading) return 'Starting…';
  switch (variant) {
    case 'verified':
      return 'Verified';
    case 'pending':
      return 'Check Status';
    case 'rejected':
      return 'Retry Verification';
    case 'profile_incomplete':
      return 'Go to Settings';
    default:
      return 'Verify Me';
  }
}

function formatDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return null;
  }
}

export function VerifyMeCard({ verification }: VerifyMeCardProps) {
  const [loading, setLoading] = useState(false);
  const { mutate } = useSWRConfig();

  const variant = getVariant(verification);
  const content = getContent(variant, verification);

  const cardClass = [
    verifyCard,
    variant === 'verified' ? verifyCardVerified : '',
    variant === 'pending' ? verifyCardPending : '',
    variant === 'rejected' ? verifyCardRejected : '',
    variant === 'profile_incomplete' ? verifyCardProfileIncomplete : '',
  ]
    .filter(Boolean)
    .join(' ');

  const iconClass = [
    verifyCardIcon,
    variant === 'verified' ? verifyCardIconVerified : '',
    variant === 'pending' ? verifyCardIconPending : '',
    variant === 'rejected' ? verifyCardIconRejected : '',
    variant === 'default' || variant === 'profile_incomplete' ? verifyCardIconDefault : '',
  ]
    .filter(Boolean)
    .join(' ');

  const badgeClass = [
    verifyCardBadge,
    variant === 'verified' ? verifyCardBadgeVerified : '',
    variant === 'pending' ? verifyCardBadgePending : '',
    variant === 'rejected' ? verifyCardBadgeRejected : '',
    variant === 'default' || variant === 'profile_incomplete' ? verifyCardBadgeDefault : '',
  ]
    .filter(Boolean)
    .join(' ');

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
      if (result?.error) throw new Error(result.error.message);

      toast.success(`Verification submitted`, {
        description: `We'll update your dashboard after Stripe finishes processing your documents.`,
      });
      void mutate(queryKeys.dashboard.main());
    } catch (err) {
      const raw = err instanceof Error ? err.message : `Failed to start verification`;
      toast.error(getErrorMessageForUser(raw, `We couldn't start identity verification. Please try again.`));
    } finally {
      setLoading(false);
    }
  }

  const startedAt = formatDate(verification?.startedAt);
  const verifiedAt = formatDate(verification?.verifiedAt);
  const updatedAt = formatDate(verification?.updatedAt);

  const isDisabled = loading || (variant !== 'profile_incomplete' && verification?.canStart === false && variant !== 'verified' && variant !== 'pending');

  return (
    <div className={cardClass} data-testid="verify-me-card" data-variant={variant}>
      <div className={iconClass} aria-hidden="true">
        {variant === 'pending' ? (
          <span className={verifyCardSpinner} />
        ) : (
          content.icon
        )}
      </div>

      <div className={verifyCardBody}>
        <div className={verifyCardTitle}>
          {content.title}
          <span className={badgeClass}>{content.badge}</span>
        </div>

        <p className={verifyCardDescription}>{content.description}</p>

        {(startedAt || verifiedAt || updatedAt) && (
          <dl className={verifyCardMeta}>
            {verifiedAt && (
              <div className={verifyCardMetaItem}>
                <dt>Verified</dt>
                <dd>{verifiedAt}</dd>
              </div>
            )}
            {startedAt && !verifiedAt && (
              <div className={verifyCardMetaItem}>
                <dt>Started</dt>
                <dd>{startedAt}</dd>
              </div>
            )}
            {updatedAt && (
              <div className={verifyCardMetaItem}>
                <dt>Last updated</dt>
                <dd>{updatedAt}</dd>
              </div>
            )}
          </dl>
        )}

        <div className={verifyCardActions}>
          {variant === 'profile_incomplete' ? (
            <Link
              href="/settings"
              className={verifyCardPrimaryBtn}
              data-testid="verify-me-card-cta"
            >
              Go to Settings
            </Link>
          ) : variant === 'verified' ? (
            <button disabled className={[verifyCardPrimaryBtn, verifyCardPrimaryBtnDisabled].join(' ')} data-testid="verify-me-card-cta">
              Verified
            </button>
          ) : (
            <button
              onClick={startVerification}
              disabled={isDisabled}
              className={[verifyCardPrimaryBtn, loading ? verifyCardPrimaryBtnLoading : '', isDisabled && !loading ? verifyCardPrimaryBtnDisabled : ''].filter(Boolean).join(' ')}
              data-testid="verify-me-card-cta"
            >
              {getButtonLabel(variant, loading)}
            </button>
          )}

          {variant === 'rejected' && (
            <Link href="/settings" className={verifyCardSecondaryBtn}>
              Update Profile
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
