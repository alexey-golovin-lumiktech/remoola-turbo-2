'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { toast } from 'sonner';

import { useRecentPaymentRequests } from '../../lib/client';
import { getLocalToastMessage, localToastKeys } from '../../lib/error-messages';
import styles from '../ui/classNames.module.css';

export function RecentPaymentRequestsCard() {
  const { data: recentRequests, error, isLoading, mutate } = useRecentPaymentRequests();

  useEffect(() => {
    if (error) toast.error(getLocalToastMessage(localToastKeys.LOAD_RECENT_REQUESTS));
  }, [error]);

  if (isLoading) {
    return (
      <div className={styles.adminCard}>
        <div className={styles.adminCardTitle}>Last 24h Payment Requests</div>
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
        <div className={styles.adminCardTitle}>Last 24h Payment Requests</div>
        <div className={styles.adminCardContent}>
          <button type="button" className={styles.adminPrimaryButton} onClick={() => void mutate()}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!recentRequests || recentRequests.length === 0) {
    return (
      <div className={styles.adminCard}>
        <div className={styles.adminCardTitle}>Last 24h Payment Requests</div>
        <div className={styles.adminCardContent}>
          <div className={styles.adminTextGray500}>No payment requests in the last 24 hours</div>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case `COMPLETED`:
        return styles.adminStatusPillGood;
      case `DENIED`:
      case `UNCOLLECTIBLE`:
        return styles.adminStatusPillBad;
      case `DRAFT`:
      case `WAITING`:
      case `WAITING_RECIPIENT_APPROVAL`:
      case `PENDING`:
        return styles.adminStatusPillNeutral;
      default:
        return styles.adminStatusPillNeutral;
    }
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat(`en-US`, {
      style: `currency`,
      currency: `USD`,
    }).format(num);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
      return `Just now`;
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  return (
    <div className={styles.adminCard}>
      <div className={styles.adminCardTitle}>Last 24h Payment Requests</div>
      <div className={styles.adminCardContent}>
        <div className="space-y-3">
          {recentRequests.slice(0, 10).map((request) => (
            <div key={request.id} className="border-b border-gray-100 pb-3 last:border-b-0 last:pb-0">
              <div className="flex items-center justify-between mb-1">
                <Link
                  href={`/payment-requests/${request.id}`}
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  {request.description || `Payment Request ${request.id.slice(-8)}`}
                </Link>
                <span className={styles.adminTextMedium}>{formatAmount(request.amount)}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`${styles.adminStatusPillBase} ${getStatusColor(request.status)}`}>
                    {request.status.replace(/_/g, ` `)}
                  </span>
                  <span className={styles.adminTextGray600}>{request.requester?.email || `Unknown`}</span>
                </div>
                <span className={styles.adminTextGray500}>{formatTime(request.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
        {recentRequests.length > 10 && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <Link href="/payment-requests" className="text-sm text-blue-600 hover:text-blue-800">
              View all payment requests →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
