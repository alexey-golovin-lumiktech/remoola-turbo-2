'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { formatDateTimeForDisplay } from '../../lib/date-utils';
import { type ConsumerContactDetails } from '../../types';
import styles from '../ui/classNames.module.css';

const {
  contactDetailsCard,
  contactDetailsCardTitle,
  contactDetailsCardTitleLg,
  contactDetailsContainer,
  contactDetailsDocCard,
  contactDetailsDocsGrid,
  contactDetailsEmptyText,
  contactDetailsPaymentLink,
  contactDetailsPaymentList,
  contactDetailsPaymentMeta,
  contactDetailsPre,
  contactDetailsSubtitle,
  contactDetailsTitle,
  linkPrimaryUnderlineSm,
  textPrimary,
  fontMedium,
} = styles;

type ContactDetailsViewProps = { id: ConsumerContactDetails[`id`] };

export function ContactDetailsView({ id }: ContactDetailsViewProps) {
  const [details, setDetails] = useState<ConsumerContactDetails>();

  const loadDetails = useCallback(async () => {
    const res = await fetch(`/api/contacts/${id}/details`, {
      method: `GET`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      cache: `no-store`,
    });
    if (!res.ok) throw new Error(`Failed to load contact`);
    const json = await res.json();
    setDetails(json);
  }, [id]);

  useEffect(() => {
    void loadDetails();
  }, [loadDetails]);
  if (!details) return null;

  return (
    <div className={contactDetailsContainer}>
      <div>
        <h1 className={contactDetailsTitle}>{details.name ?? details.email}</h1>
        <p className={contactDetailsSubtitle}>{details.email}</p>
      </div>

      {/* Contact address */}
      <div className={contactDetailsCard}>
        <h2 className={contactDetailsCardTitle}>Address</h2>
        <pre className={contactDetailsPre}>{JSON.stringify(details.address, null, 2)}</pre>
      </div>

      {/* Payment Requests */}
      <div className={contactDetailsCard}>
        <h2 className={contactDetailsCardTitleLg}>Payment Requests</h2>

        <div className={contactDetailsPaymentList}>
          {details.paymentRequests.map((pr) => (
            <Link key={pr.id} href={`/payments/${pr.id}`} className={contactDetailsPaymentLink}>
              <div className={fontMedium}>
                ${pr.amount} — {pr.status}
              </div>
              <div className={contactDetailsPaymentMeta}>{formatDateTimeForDisplay(pr.createdAt)}</div>
            </Link>
          ))}

          {details.paymentRequests.length === 0 && <div className={contactDetailsEmptyText}>No payment requests</div>}
        </div>
      </div>

      {/* Documents */}
      <div className={contactDetailsCard}>
        <h2 className={contactDetailsCardTitleLg}>Documents</h2>

        <div className={contactDetailsDocsGrid}>
          {details.documents.map((doc) => (
            <div key={doc.id} className={contactDetailsDocCard}>
              <div className={`${fontMedium} ${textPrimary}`}>{doc.name}</div>
              <a href={doc.url} target="_blank" className={linkPrimaryUnderlineSm} rel="noreferrer">
                Download
              </a>
            </div>
          ))}

          {details.documents.length === 0 && <div className={contactDetailsEmptyText}>No documents</div>}
        </div>
      </div>
    </div>
  );
}
