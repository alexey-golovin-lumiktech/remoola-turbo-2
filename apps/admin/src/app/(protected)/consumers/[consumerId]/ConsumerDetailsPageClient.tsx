'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import { type TVerificationStatus } from '@remoola/api-types';

import { CardSkeleton, JsonView } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type Consumer } from '../../../../lib';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../../lib/error-messages';
import { type LoadState } from '../../../../lib/load-state';
import { handleSessionExpired } from '../../../../lib/session-expired';

export function ConsumerDetailsPageClient({ consumerId }: { consumerId: string }) {
  const [loadState, setLoadState] = useState<LoadState>(`loading`);
  const [consumerDetails, setConsumerDetails] = useState<Consumer | null>(null);
  const [verificationReason, setVerificationReason] = useState<string>(``);
  const [verificationLoading, setVerificationLoading] = useState(false);

  const loadConsumer = useCallback(async () => {
    setLoadState(`loading`);
    try {
      const response = await fetch(`/api/consumers/${consumerId}`, {
        cache: `no-store`,
        credentials: `include`,
      });
      if (response.status === 401) {
        handleSessionExpired();
        setLoadState(`unauthorized`);
        return;
      }
      if (response.status === 403) {
        setLoadState(`unauthorized`);
        return;
      }
      if (!response.ok) {
        setLoadState(`error`);
        return;
      }
      const consumer = (await response.json()) as Consumer;
      setConsumerDetails(consumer);
      if (consumer?.verificationReason) {
        setVerificationReason(consumer.verificationReason);
      }
      setLoadState(`ready`);
    } catch {
      setLoadState(`error`);
    }
  }, [consumerId]);

  useEffect(() => {
    void loadConsumer();
  }, [loadConsumer]);

  if (loadState === `loading`) {
    return (
      <div className={styles.adminPageStack}>
        <div className={styles.adminCard}>
          <div className={styles.adminCardContent}>
            <CardSkeleton />
          </div>
        </div>
      </div>
    );
  }

  if (loadState === `unauthorized`) {
    return (
      <div className={styles.adminPageStack} data-testid="consumer-details-unauthorized">
        <div className={styles.adminCard}>
          <div className={styles.adminCardContent}>
            <p className={styles.adminTextGray600}>Session expired. Redirecting…</p>
          </div>
        </div>
        <Link href={`/consumers`} className={styles.adminPrimaryButton}>
          Back to Consumers
        </Link>
      </div>
    );
  }

  if (loadState === `error`) {
    return (
      <div className={styles.adminPageStack} data-testid="consumer-details-error">
        <div className={styles.adminCard}>
          <div className={styles.adminCardContent}>
            <p className={styles.adminTextGray600}>Unable to load consumer. Please try again.</p>
            <button type="button" className={styles.adminPrimaryButton} onClick={() => void loadConsumer()}>
              Retry
            </button>
          </div>
        </div>
        <Link href={`/consumers`} className={styles.adminPrimaryButton}>
          Back to Consumers
        </Link>
      </div>
    );
  }

  if (loadState !== `ready` || !consumerDetails) {
    return (
      <div className={styles.adminPageStack}>
        <div className={styles.adminTextGray600}>Consumer not found</div>
        <Link href={`/consumers`} className={styles.adminPrimaryButton}>
          Back to Consumers
        </Link>
      </div>
    );
  }

  const statusLabel = (status?: TVerificationStatus | null) => {
    switch (status) {
      case `APPROVED`:
        return `Approved`;
      case `REJECTED`:
        return `Rejected`;
      case `MORE_INFO`:
        return `More info requested`;
      case `FLAGGED`:
        return `Flagged`;
      default:
        return `Pending`;
    }
  };

  const statusClass = (status?: TVerificationStatus | null) => {
    switch (status) {
      case `APPROVED`:
        return styles.adminStatusPillGood;
      case `REJECTED`:
        return styles.adminStatusPillBad;
      case `MORE_INFO`:
      case `FLAGGED`:
      default:
        return styles.adminStatusPillNeutral;
    }
  };

  const updateVerification = async (action: `approve` | `reject` | `more_info` | `flag`) => {
    setVerificationLoading(true);
    try {
      const response = await fetch(`/api/consumers/${consumerId}/verification`, {
        method: `PATCH`,
        credentials: `include`,
        headers: { 'content-type': `application/json` },
        body: JSON.stringify({
          action,
          reason: verificationReason ? verificationReason.trim() : null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update verification status`);
      }

      const updatedConsumer = (await response.json()) as Consumer;
      setConsumerDetails(updatedConsumer);
      if (updatedConsumer.verificationReason) {
        setVerificationReason(updatedConsumer.verificationReason);
      }
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(getErrorMessageForUser(message, getLocalToastMessage(localToastKeys.VERIFICATION_UPDATE_FAILED)));
    } finally {
      setVerificationLoading(false);
    }
  };

  return (
    <div className={styles.adminPageStack}>
      <div className={styles.adminTextGray600} style={{ marginBottom: `0.5rem` }}>
        <Link href={`/consumers`}>← Back to Consumers</Link>
      </div>
      <div>
        <div className={styles.adminTextGray500}>Consumer</div>
        <h1 className={styles.adminPageTitle}>{consumerDetails.email}</h1>
        <div className={styles.adminDetailMeta}>
          {consumerDetails.accountType}
          {consumerDetails.contractorKind ? ` / ${consumerDetails.contractorKind}` : ``}
          {consumerDetails.stripeCustomerId ? ` • Stripe: ${consumerDetails.stripeCustomerId}` : ``}
        </div>
      </div>

      <div className={styles.adminDetailsGrid}>
        <div className={styles.adminCard}>
          <div className={styles.adminCardTitle}>Verification</div>
          <div className={styles.adminCardContent}>
            <div className="flex items-center gap-2">
              <span className={`${styles.adminStatusPillBase} ${statusClass(consumerDetails.verificationStatus)}`}>
                {statusLabel(consumerDetails.verificationStatus)}
              </span>
              <span className={styles.adminTextGray600}>
                Verified: {consumerDetails.verified ? `Yes` : `No`} • Legal:{` `}
                {consumerDetails.legalVerified ? `Yes` : `No`}
              </span>
            </div>

            <div className="mt-3">
              <label className={styles.adminFormLabelBlock} htmlFor="consumer-verification-reason">
                <div className={styles.adminFormLabelText}>Reason / Notes</div>
                <textarea
                  id="consumer-verification-reason"
                  name="verificationReason"
                  className={styles.adminFormInput}
                  rows={3}
                  value={verificationReason}
                  onChange={(e) => setVerificationReason(e.target.value)}
                  placeholder="Optional reason for the decision"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                />
              </label>
            </div>

            <div className={styles.adminModalFooter}>
              <button
                className={styles.adminModalPrimary}
                onClick={(e) => (e.stopPropagation(), e.preventDefault(), updateVerification(`approve`))}
                disabled={verificationLoading}
              >
                Approve
              </button>
              <button
                className={styles.adminActionButton}
                onClick={(e) => (e.stopPropagation(), e.preventDefault(), updateVerification(`more_info`))}
                disabled={verificationLoading}
              >
                Request more info
              </button>
              <button
                className={styles.adminDeleteButton}
                onClick={(e) => (e.stopPropagation(), e.preventDefault(), updateVerification(`reject`))}
                disabled={verificationLoading}
              >
                Reject
              </button>
              <button
                className={styles.adminActionButton}
                onClick={(e) => (e.stopPropagation(), e.preventDefault(), updateVerification(`flag`))}
                disabled={verificationLoading}
              >
                Flag
              </button>
            </div>
          </div>
        </div>

        <div className={styles.adminCard}>
          <div className={styles.adminCardTitle}>Documents</div>
          <div className={styles.adminCardContent}>
            {consumerDetails.consumerResources && consumerDetails.consumerResources.length > 0 ? (
              <ul className="space-y-2">
                {consumerDetails.consumerResources.map((resource) => (
                  <li key={resource.id} className="flex items-center justify-between">
                    <span className={styles.adminTextGray700}>{resource.resource.originalName}</span>
                    <a
                      href={resource.resource.downloadUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800"
                    >
                      View
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <div className={styles.adminTextGray500}>No documents uploaded.</div>
            )}
          </div>
        </div>
        <div className={styles.adminCard}>
          <div className={styles.adminCardTitle}>Personal Details</div>
          <div className={styles.adminCardContent}>
            {consumerDetails.personalDetails ? (
              <JsonView value={consumerDetails.personalDetails} />
            ) : (
              <div className={styles.adminTextGray500}>—</div>
            )}
          </div>
        </div>

        <div className={styles.adminCard}>
          <div className={styles.adminCardTitle}>Organization Details</div>
          <div className={styles.adminCardContent}>
            {consumerDetails.organizationDetails ? (
              <JsonView value={consumerDetails.organizationDetails} />
            ) : (
              <div className={styles.adminTextGray500}>—</div>
            )}
          </div>
        </div>

        <div className={styles.adminCard}>
          <div className={styles.adminCardTitle}>Address Details</div>
          <div className={styles.adminCardContent}>
            {consumerDetails.addressDetails ? (
              <JsonView value={consumerDetails.addressDetails} />
            ) : (
              <div className={styles.adminTextGray500}>—</div>
            )}
          </div>
        </div>

        <div className={styles.adminCard}>
          <div className={styles.adminCardTitle}>GoogleProfile Details</div>
          <div className={styles.adminCardContent}>
            {consumerDetails.googleProfileDetails ? (
              <JsonView value={consumerDetails.googleProfileDetails} />
            ) : (
              <div className={styles.adminTextGray500}>—</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
