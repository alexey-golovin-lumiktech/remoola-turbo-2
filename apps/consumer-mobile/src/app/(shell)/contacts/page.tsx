import { headers } from 'next/headers';

import { getContactsList } from '../../../features/contacts/queries';
import { ContactsListView } from '../../../features/contacts/ui/ContactsListView';

export default async function ContactsPage() {
  const headersList = await headers();
  const cookie = headersList.get(`cookie`);
  const contacts = await getContactsList(cookie);
  return <ContactsListView contacts={contacts} />;
}
