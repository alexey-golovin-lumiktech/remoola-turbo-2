'use client';

import { useEffect, useState } from 'react';

import { JsonView } from '../../../../components';
import styles from '../../../../components/ui/classNames.module.css';
import { type Consumer } from '../../../../lib';

export function ConsumerDetailsPageClient({ consumerId }: { consumerId: string }) {
  const [consumerDetails, setConsumerDetails] = useState<Consumer | null>(null);

  useEffect(() => {
    async function loadConsumerDetails(consumerId: string): Promise<Consumer | null> {
      const response = await fetch(`/api/consumers/${consumerId}`, { cache: `no-store`, credentials: `include` });
      if (!response.ok) return null;
      return (await response.json()) as Consumer;
    }

    loadConsumerDetails(consumerId).then(setConsumerDetails);
  }, [consumerId]);

  if (!consumerDetails) return <div className={styles.adminTextGray600}>Consumer not found</div>;

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
