import Link from 'next/link';

import styles from './ContactDetailView.module.css';
import { CalendarIcon } from '../../../shared/ui/icons/CalendarIcon';
import { CheckIcon } from '../../../shared/ui/icons/CheckIcon';
import { ChevronLeftIcon } from '../../../shared/ui/icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../../../shared/ui/icons/ChevronRightIcon';
import { ClipboardCopyIcon } from '../../../shared/ui/icons/ClipboardCopyIcon';
import { CurrencyDollarIcon } from '../../../shared/ui/icons/CurrencyDollarIcon';
import { DocumentIcon } from '../../../shared/ui/icons/DocumentIcon';
import { DownloadIcon } from '../../../shared/ui/icons/DownloadIcon';
import { MailIcon } from '../../../shared/ui/icons/MailIcon';
import { MapPinIcon } from '../../../shared/ui/icons/MapPinIcon';
import { UserIcon } from '../../../shared/ui/icons/UserIcon';
import { type ContactDetails } from '../schemas';

interface ContactDetailViewProps {
  contactDetails: ContactDetails | null;
  contactId: string;
}

function formatDate(dateString: string | undefined): string {
  if (!dateString) return `N/A`;
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString(`en-US`, {
      year: `numeric`,
      month: `short`,
      day: `numeric`,
    });
  } catch {
    return `N/A`;
  }
}

function formatAddress(address: ContactDetails[`address`]): string | null {
  if (!address) return null;
  const parts = [address.street, address.city, address.state, address.postalCode, address.country].filter(Boolean);
  return parts.length > 0 ? parts.join(`, `) : null;
}

function getInitials(name: string | null | undefined, email: string | null | undefined): string {
  if (name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      const first = parts[0]?.[0];
      const last = parts[parts.length - 1]?.[0];
      if (first && last) {
        return `${first}${last}`.toUpperCase();
      }
    }
    return name.slice(0, 2).toUpperCase();
  }
  if (email) {
    return email.slice(0, 2).toUpperCase();
  }
  return `??`;
}

export function ContactDetailView({ contactDetails, contactId }: ContactDetailViewProps) {
  if (!contactDetails) {
    return (
      <div className={styles.main} data-testid="consumer-mobile-contact-detail">
        <div className={styles.notFoundCard}>
          <div className={styles.notFoundIcon}>
            <UserIcon size={32} className={styles.notFoundIconSvg} />
          </div>
          <h2 className={styles.notFoundTitle}>Contact Not Found</h2>
          <p className={styles.notFoundMessage}>
            The contact you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
        </div>
        <Link href="/contacts" className={styles.backLinkPrimary}>
          <ChevronLeftIcon size={18} />
          Back to Contacts
        </Link>
      </div>
    );
  }

  const formattedAddress = formatAddress(contactDetails.address);
  const initials = getInitials(contactDetails.name, contactDetails.email);
  const totalPayments = contactDetails.paymentRequests.length;
  const completedPayments = contactDetails.paymentRequests.filter((pr) => pr.status === `completed`).length;
  const totalDocuments = contactDetails.documents.length;

  return (
    <div className={styles.main} data-testid="consumer-mobile-contact-detail">
      <div className={styles.backRow}>
        <Link href="/contacts" className={styles.backLink}>
          <ChevronLeftIcon size={18} />
          Back
        </Link>
      </div>

      <div className={styles.hero}>
        <div className={styles.heroRow}>
          <div className={styles.heroAvatar}>
            <span className={styles.heroInitials}>{initials}</span>
          </div>
          <div className={styles.heroContent}>
            <h1 className={styles.heroTitle}>{contactDetails.name ?? contactDetails.email ?? contactId.slice(0, 8)}</h1>
            {contactDetails.name && contactDetails.email ? (
              <div className={styles.heroEmailRow}>
                <MailIcon size={16} className="shrink-0" />
                <p className={styles.heroEmailText}>{contactDetails.email}</p>
              </div>
            ) : null}
            {contactDetails.createdAt ? (
              <div className={styles.heroDateRow}>
                <CalendarIcon size={14} className="shrink-0" />
                <p className={styles.heroDateText}>Member since {formatDate(contactDetails.createdAt)}</p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconPrimary}`}>
            <CurrencyDollarIcon size={28} />
          </div>
          <p className={styles.statValue}>{totalPayments}</p>
          <p className={styles.statLabel}>Payments</p>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconGreen}`}>
            <CheckIcon className="h-7 w-7" strokeWidth={2.5} />
          </div>
          <p className={styles.statValue}>{completedPayments}</p>
          <p className={styles.statLabel}>Completed</p>
        </div>
        <div className={styles.statCard}>
          <div className={`${styles.statIconWrap} ${styles.statIconBlue}`}>
            <DocumentIcon size={28} />
          </div>
          <p className={styles.statValue}>{totalDocuments}</p>
          <p className={styles.statLabel}>Documents</p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <div className={`${styles.cardIconWrap} ${styles.cardIconWrapPrimary}`}>
            <UserIcon size={18} className={styles.cardIconPrimary} />
          </div>
          <h2 className={styles.cardTitle}>Contact Information</h2>
        </div>
        <dl className={styles.infoList}>
          {contactDetails.email ? (
            <div className={styles.infoRow}>
              <div className={`${styles.infoIconWrap} ${styles.infoIconWrapBlue}`}>
                <MailIcon size={18} className={styles.infoIconBlue} />
              </div>
              <div className={styles.infoContent}>
                <dt className={styles.infoLabel}>Email Address</dt>
                <dd className="mt-0.5">
                  <a href={`mailto:${contactDetails.email}`} className={styles.emailLink}>
                    {contactDetails.email}
                  </a>
                </dd>
              </div>
            </div>
          ) : null}
          {formattedAddress ? (
            <div className={styles.infoRow}>
              <div className={`${styles.infoIconWrap} ${styles.infoIconWrapPurple}`}>
                <MapPinIcon className={styles.infoIconPurple} />
              </div>
              <div className={styles.infoContent}>
                <dt className={styles.infoLabel}>Address</dt>
                <dd className={styles.infoValue}>{formattedAddress}</dd>
              </div>
            </div>
          ) : null}
          <div className={styles.infoRow}>
            <div className={`${styles.infoIconWrap} ${styles.infoIconWrapSlate}`}>
              <ClipboardCopyIcon size={18} className={styles.infoIconSlate} />
            </div>
            <div className={styles.infoContent}>
              <dt className={styles.infoLabel}>Contact ID</dt>
              <dd className={styles.infoValueMono}>{contactDetails.id}</dd>
            </div>
          </div>
        </dl>
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeaderWithBetween}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIconWrap} ${styles.cardIconWrapGreen}`}>
              <CurrencyDollarIcon size={18} className={styles.cardIconGreen} />
            </div>
            <h2 className={styles.cardTitle}>Payment Requests</h2>
          </div>
          {totalPayments > 0 ? <span className={styles.cardBadge}>{totalPayments}</span> : null}
        </div>
        {contactDetails.paymentRequests.length === 0 ? (
          <div className={styles.emptyBlock}>
            <div className={styles.emptyIcon}>
              <CurrencyDollarIcon size={24} className={styles.emptyIconSvg} />
            </div>
            <p className={styles.emptyTitle}>No payment requests yet</p>
            <p className={styles.emptyMessage}>Payment history will appear here</p>
          </div>
        ) : (
          <div className={styles.prList}>
            {contactDetails.paymentRequests.map((pr) => (
              <Link key={pr.id} href={`/payments/${pr.id}`} className={styles.prItem}>
                <div className={styles.prItemRow}>
                  <div className={styles.prItemContent}>
                    <div className="flex items-center gap-2">
                      <span className={styles.prAmount}>${pr.amount}</span>
                      <span
                        className={`${styles.prStatus} ${
                          pr.status === `completed`
                            ? styles.prStatusCompleted
                            : pr.status === `pending`
                              ? styles.prStatusPending
                              : styles.prStatusOther
                        }`}
                      >
                        {pr.status}
                      </span>
                    </div>
                    {pr.description ? <p className={styles.prDescription}>{pr.description}</p> : null}
                    <div className={styles.prDateRow}>
                      <CalendarIcon size={14} />
                      {formatDate(pr.createdAt)}
                    </div>
                  </div>
                  <div className={styles.prChevronWrap}>
                    <ChevronRightIcon size={20} className={styles.prChevron} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.cardHeaderWithBetween}>
          <div className={styles.cardHeader}>
            <div className={`${styles.cardIconWrap} ${styles.cardIconWrapBlue}`}>
              <DocumentIcon size={18} className={styles.cardIconBlue} />
            </div>
            <h2 className={styles.cardTitle}>Documents</h2>
          </div>
          {totalDocuments > 0 ? <span className={styles.cardBadge}>{totalDocuments}</span> : null}
        </div>
        {contactDetails.documents.length === 0 ? (
          <div className={styles.emptyBlock}>
            <div className={styles.emptyIcon}>
              <DocumentIcon size={24} className={styles.emptyIconSvg} />
            </div>
            <p className={styles.emptyTitle}>No documents yet</p>
            <p className={styles.emptyMessage}>Uploaded documents will appear here</p>
          </div>
        ) : (
          <div className={styles.docList}>
            {contactDetails.documents.map((doc) => (
              <div key={doc.id} className={styles.docItem}>
                <div className="flex items-center gap-3">
                  <div className={styles.docItemIconWrap}>
                    <DocumentIcon size={22} className={styles.docItemIcon} />
                  </div>
                  <div>
                    <p className={styles.docItemName}>{doc.name}</p>
                    {doc.createdAt ? (
                      <div className={styles.docItemDateRow}>
                        <CalendarIcon size={12} />
                        {formatDate(doc.createdAt)}
                      </div>
                    ) : null}
                  </div>
                </div>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className={styles.downloadBtn}>
                  <DownloadIcon size={16} strokeWidth={2} />
                  Download
                </a>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
