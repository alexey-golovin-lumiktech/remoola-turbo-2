import { Suspense } from 'react';

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
  const createMode = getSingleValue(resolvedSearchParams?.create) === `1`;
  const editContactId = getSingleValue(resolvedSearchParams?.edit).trim();
  const initialEmail = getSingleValue(resolvedSearchParams?.email);
  const returnTo = sanitizeContactsReturnTo(getSingleValue(resolvedSearchParams?.returnTo));
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
      <Suspense
        fallback={
          <div className="rounded-[28px] border border-[color:var(--app-border)] bg-[var(--app-surface)] p-5 text-sm text-[var(--app-text-muted)] shadow-[var(--app-shadow)]">
            Loading contacts...
          </div>
        }
      >
        <ContactsWorkspaceSection
          createMode={createMode}
          editContactId={editContactId}
          initialEmail={initialEmail}
          page={page}
          pageSize={pageSize}
          query={query}
          returnTo={returnTo}
          searchMode={searchMode}
        />
      </Suspense>
    </div>
  );
}

async function ContactsWorkspaceSection({
  createMode,
  editContactId,
  initialEmail,
  page,
  pageSize,
  query,
  returnTo,
  searchMode,
}: {
  createMode: boolean;
  editContactId: string;
  initialEmail: string;
  page: number;
  pageSize: number;
  query: string;
  returnTo: string | null;
  searchMode: boolean;
}) {
  const [contactsResponse, searchResults, initialEditingContact] = await Promise.all([
    searchMode ? Promise.resolve(null) : getContacts(page, pageSize),
    searchMode ? searchContacts(query) : Promise.resolve(null),
    editContactId ? getContact(editContactId) : Promise.resolve(null),
  ]);
  const contacts = searchMode ? (searchResults ?? []) : (contactsResponse?.items ?? []);

  return (
    <ContactsClient
      contacts={contacts}
      createMode={createMode}
      initialEmail={initialEmail}
      initialEditingContact={initialEditingContact}
      returnTo={returnTo ?? undefined}
      initialQuery={query}
      searchMode={searchMode}
      totalContacts={contactsResponse?.total ?? contacts.length}
      page={contactsResponse?.page ?? page}
      pageSize={contactsResponse?.pageSize ?? pageSize}
    />
  );
}
