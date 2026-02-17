'use client';

import { useEffect, useState } from 'react';

import { type TVerificationStatus } from '@remoola/api-types';

import { JsonView } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type Consumer } from '../../../../lib';

export function ConsumerDetailsPageClient({ consumerId }: { consumerId: string }) {
  const [consumerDetails, setConsumerDetails] = useState<Consumer | null>(null);
  const [verificationReason, setVerificationReason] = useState<string>(``);
  const [verificationError, setVerificationError] = useState<string>(``);
  const [verificationLoading, setVerificationLoading] = useState(false);

  useEffect(() => {
    async function loadConsumerDetails(consumerId: string): Promise<Consumer | null> {
      const response = await fetch(`/api/consumers/${consumerId}`, { cache: `no-store`, credentials: `include` });
      if (!response.ok) return null;
      return (await response.json()) as Consumer;
    }

    loadConsumerDetails(consumerId).then((consumer) => {
      setConsumerDetails(consumer);
      if (consumer?.verificationReason) {
        setVerificationReason(consumer.verificationReason);
      }
    });
  }, [consumerId]);

  if (!consumerDetails) return <div className={styles.adminTextGray600}>Consumer not found</div>;

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
    setVerificationError(``);
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
    } catch (error: any) {
      setVerificationError(error.message || `Failed to update verification status`);
    } finally {
      setVerificationLoading(false);
    }
  };

  return (
    <div className={styles.adminPageStack}>
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
              <label className={styles.adminFormLabelBlock}>
                <div className={styles.adminFormLabelText}>Reason / Notes</div>
                <textarea
                  className={styles.adminFormInput}
                  rows={3}
                  value={verificationReason}
                  onChange={(e) => setVerificationReason(e.target.value)}
                  placeholder="Optional reason for the decision"
                />
              </label>
              {verificationError && <div className={styles.adminFormError}>{verificationError}</div>}
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
