import { headers } from 'next/headers';

import { getContactsList, ContactsListView } from '../../../features/contacts';

export default async function ContactsPage() {
  const headersList = await headers();
  const cookie = headersList.get(`cookie`);
  const contacts = await getContactsList(cookie);
  return <ContactsListView contacts={contacts} />;
}
