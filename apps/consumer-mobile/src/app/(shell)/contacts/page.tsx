import { headers } from 'next/headers';
import { Suspense } from 'react';

import styles from './page.module.css';
import { getContactsList } from '../../../features/contacts/queries';
import { ContactsListView } from '../../../features/contacts/ui/ContactsListView';

function ContactsPageSuspenseFallback() {
  return (
    <div className={styles.fallback} aria-busy="true">
      <div className={styles.spinner} />
    </div>
  );
}

export default async function ContactsPage() {
  const headersList = await headers();
  const cookie = headersList.get(`cookie`);
  const contacts = await getContactsList(cookie);
  return (
    <Suspense fallback={<ContactsPageSuspenseFallback />}>
      <ContactsListView contacts={contacts} />
    </Suspense>
  );
}
