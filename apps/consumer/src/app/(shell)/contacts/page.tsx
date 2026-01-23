import { ContactsPageClient } from '../../../components';

export default async function ContactsPage() {
  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-white">Contacts</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Saved contractors and business contacts.</p>
      </div>

      <div className="rounded-2xl bg-white/90 dark:bg-slate-800/90 p-4 shadow-sm">
        <ContactsPageClient />
      </div>
    </div>
  );
}
