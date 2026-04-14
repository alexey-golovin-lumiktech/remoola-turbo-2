import { sanitizeContactsReturnTo } from './contacts-return-to';
import { ContactsClient } from './ContactsClient';
import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from '../../../features/help/get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';
import { HelpContextualGuides } from '../../../features/help/ui';
import { getContact, getContacts, searchContacts } from '../../../lib/consumer-api.server';
import { UsersIcon } from '../../../shared/ui/icons/UsersIcon';
import { PageHeader } from '../../../shared/ui/shell-primitives';

type SearchParams = Record<string, string | string[] | undefined>;

function getSingleValue(value: string | string[] | undefined) {
  return typeof value === `string` ? value : Array.isArray(value) ? (value[0] ?? ``) : ``;
}

export default async function ContactsPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = getSingleValue(resolvedSearchParams?.query).trim();
  const searchMode = query.length > 0;
  const page = Math.max(1, Number(getSingleValue(resolvedSearchParams?.page)) || 1);
  const pageSize = Math.max(1, Number(getSingleValue(resolvedSearchParams?.pageSize)) || 20);
  const contactsResponse = searchMode ? null : await getContacts(page, pageSize);
  const searchResults = searchMode ? await searchContacts(query) : null;
  const contacts = searchMode ? (searchResults ?? []) : (contactsResponse?.items ?? []);
  const createMode = getSingleValue(resolvedSearchParams?.create) === `1`;
  const editContactId = getSingleValue(resolvedSearchParams?.edit).trim();
  const initialEmail = getSingleValue(resolvedSearchParams?.email);
  const returnTo = sanitizeContactsReturnTo(getSingleValue(resolvedSearchParams?.returnTo));
  const initialEditingContact = editContactId ? await getContact(editContactId) : null;
  const contactsHelpGuides = getContextualHelpGuides({
    route: HELP_CONTEXT_ROUTE.CONTACTS,
    preferredSlugs: [
      HELP_GUIDE_SLUG.CONTACTS_ADD_AND_USE,
      HELP_GUIDE_SLUG.CONTACTS_OVERVIEW,
      HELP_GUIDE_SLUG.CONTACTS_COMMON_ISSUES,
    ],
    limit: 3,
  });

  return (
    <div>
      <PageHeader title="Contacts" icon={<UsersIcon className="h-10 w-10 text-white" />} />
      <HelpContextualGuides
        guides={contactsHelpGuides}
        title="Use contacts without losing the next step"
        description="These guides explain how to add and reuse saved contacts, when to search versus edit, and what to check before a contact-driven workflow moves into contracts or payments."
        className="mb-5"
      />
      <ContactsClient
        contacts={contacts}
        createMode={createMode}
        initialEmail={initialEmail}
        initialEditingContact={initialEditingContact}
        returnTo={returnTo}
        initialQuery={query}
        searchMode={searchMode}
        totalContacts={contactsResponse?.total ?? contacts.length}
        page={contactsResponse?.page ?? page}
        pageSize={contactsResponse?.pageSize ?? pageSize}
      />
    </div>
  );
}
