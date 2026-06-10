import Link from 'next/link';

import { ContactDetailContactRecordSection } from './ContactDetailContactRecordSection';
import { ContactDetailFilesSection } from './ContactDetailFilesSection';
import { ContactDetailHeaderSection } from './ContactDetailHeaderSection';
import { ContactDetailMetricsSection } from './ContactDetailMetricsSection';
import { ContactDetailNextStepsSection } from './ContactDetailNextStepsSection';
import { ContactDetailPaymentRecordsSection } from './ContactDetailPaymentRecordsSection';
import { type ContactDetailsResponse } from '../../../lib/consumer-api.server';
import { shellEmptyState } from '../../../shared/ui/shell-card-tokens';
import { shellMainAsideBalanced } from '../../../shared/ui/shell-layout-tokens';
import { Panel } from '../../../shared/ui/shell-panel';

function formatAddress(contact: ContactDetailsResponse) {
  if (!contact.address) return `No address details`;
  const parts = [
    contact.address.street,
    contact.address.city,
    contact.address.state,
    contact.address.postalCode,
    contact.address.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(`, `) : `No address details`;
}

type Props = {
  contact: ContactDetailsResponse | null;
  contactId: string;
};

export function ContactDetailView({ contact, contactId }: Props) {
  if (!contact) {
    return (
      <Panel title="Contact details">
        <div className="space-y-4">
          <div className={shellEmptyState}>Contact details are unavailable for this record.</div>
          <Link href="/contacts" className="inline-flex text-sm text-(--app-primary) hover:text-(--app-primary-strong)">
            Back to contacts
          </Link>
        </div>
      </Panel>
    );
  }

  const addressLabel = formatAddress(contact);
  const totalPayments = contact.paymentRequests.length;
  const completedPayments = contact.paymentRequests.filter(
    (payment) => payment.status.toUpperCase() === `COMPLETED`,
  ).length;
  const totalDocuments = contact.documents.length;

  return (
    <div className="space-y-5">
      <div className="mb-1">
        <Link href="/contacts" className="text-sm text-(--app-primary) hover:text-(--app-primary-strong)">
          Back to contacts
        </Link>
      </div>

      <section className={shellMainAsideBalanced}>
        <div className="space-y-5">
          <ContactDetailHeaderSection addressLabel={addressLabel} contact={contact} contactId={contactId} />
          <ContactDetailMetricsSection
            completedPayments={completedPayments}
            totalDocuments={totalDocuments}
            totalPayments={totalPayments}
          />
          <ContactDetailPaymentRecordsSection contact={contact} />
        </div>

        <div className="space-y-5">
          <ContactDetailContactRecordSection addressLabel={addressLabel} contact={contact} />
          <ContactDetailFilesSection contact={contact} />
          <ContactDetailNextStepsSection />
        </div>
      </section>
    </div>
  );
}
