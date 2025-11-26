import ContactsPageClient from '../../../components/contacts/ContactsPageClient';
import { getContacts } from '../../../lib/contacts';

export default async function ContactsPage() {
  const { items } = await getContacts();

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div>
        <h1 className="text-2xl font-semibold">Contacts</h1>
        <p className="text-sm text-gray-500">Saved contractors and business contacts.</p>
      </div>

      <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
        <ContactsPageClient initialItems={items} />
      </div>
    </div>
  );
}
