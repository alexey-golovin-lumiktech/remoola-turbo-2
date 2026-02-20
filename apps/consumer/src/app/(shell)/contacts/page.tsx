import { type Metadata } from 'next';
import { Suspense } from 'react';

import { ContactsPageClient } from '../../../components';
import styles from '../../../components/ui/classNames.module.css';

const { pageContainer, pageSubtitle, pageTitle } = styles;

export const metadata: Metadata = {
  title: `Contacts - Remoola`,
};

export default async function ContactsPage() {
  return (
    <div className={pageContainer} data-testid="consumer-contacts-page">
      <h1 className={pageTitle}>Contacts</h1>
      <p className={pageSubtitle}>Saved contractors and business contacts.</p>

      <Suspense fallback={<p aria-hidden>Loading contacts…</p>}>
        <ContactsPageClient />
      </Suspense>
    </div>
  );
}
