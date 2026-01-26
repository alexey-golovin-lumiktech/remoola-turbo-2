'use client';

import Link from 'next/link';

import { type VerificationQueueItem } from '../../lib';
import { useVerificationQueue } from '../../lib/client';
import styles from '../ui/classNames.module.css';

export function VerificationQueueCard() {
  const { data: verificationQueue, error, isLoading } = useVerificationQueue();

  if (isLoading) {
    return (
      <div className={styles.adminCard}>
        <div className={styles.adminCardTitle}>Verification Queue</div>
        <div className={styles.adminCardContent}>
          <div className={styles.adminSkeletonTextGroup}>
            <div className={styles.adminSkeletonTextLineFourFifths} />
            <div className={styles.adminSkeletonTextLineTwoThirds} />
            <div className={styles.adminSkeletonTextLineHalf} />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.adminCard}>
        <div className={styles.adminCardTitle}>Verification Queue</div>
        <div className={styles.adminCardContent}>
          <div className={styles.adminTextGray500}>Failed to load verification queue</div>
        </div>
      </div>
    );
  }

  if (!verificationQueue || verificationQueue.length === 0) {
    return (
      <div className={styles.adminCard}>
        <div className={styles.adminCardTitle}>Verification Queue</div>
        <div className={styles.adminCardContent}>
          <div className={`${styles.adminTextGray500} flex items-center gap-2`}>
            <span className="text-green-600">✓</span>
            No pending verifications
          </div>
        </div>
      </div>
    );
  }

  const getAccountTypeLabel = (type: string) => {
    switch (type) {
      case `BUSINESS`:
        return `Business`;
      case `CONTRACTOR`:
        return `Contractor`;
      default:
        return type;
    }
  };

  function compileConsumerName(consumer: VerificationQueueItem) {
    if (consumer.organizationDetails?.name) {
      return consumer.organizationDetails.name;
    }
    if (consumer.personalDetails?.firstName || consumer.personalDetails?.lastName) {
      return `${consumer.personalDetails?.firstName || ``} ${consumer.personalDetails?.lastName || ``}`.trim();
    }
    return `No name provided`;
  }

  return (
    <div className={styles.adminCard}>
      <div className={styles.adminCardTitle}>
        Verification Queue
        <span className="ml-2 text-xs text-orange-600 font-normal">({verificationQueue.length})</span>
      </div>
      <div className={styles.adminCardContent}>
        <div className="space-y-3">
          {verificationQueue.slice(0, 8).map((consumer) => (
            <div key={consumer.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between mb-1">
                <Link
                  href={`/consumers/${consumer.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  {consumer.email}
                </Link>
                <span className={`${styles.adminStatusPillBase} ${styles.adminStatusPillNeutral}`}>
                  {getAccountTypeLabel(consumer.accountType)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={styles.adminTextGray600}>{compileConsumerName(consumer)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className={styles.adminTextGray500}>{consumer.documentsCount}</span>
                  <span className={styles.adminTextGray500}>docs</span>
                </div>
              </div>
              {consumer.organizationDetails?.name && (
                <div className="text-xs text-gray-500 mt-1">{consumer.organizationDetails.name}</div>
              )}
            </div>
          ))}
        </div>
        {verificationQueue.length > 8 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Link href="/consumers" className="text-sm text-blue-600 hover:text-blue-800">
              View all pending verifications →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
