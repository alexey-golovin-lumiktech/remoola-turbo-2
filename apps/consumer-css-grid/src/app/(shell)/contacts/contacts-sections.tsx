'use client';

import { type Contact, type ContactFormStateResult } from './contact-form-state';
import { type ContactsPageStateResult } from './contacts-page-state';
import { ContactsFormSection } from './ContactsFormSection';
import { ContactsListSection } from './ContactsListSection';
import { ContactsSearchForm } from './ContactsSearchForm';
import { ContactsSummaryPanel } from './ContactsSummaryPanel';
import { shellMainAsidePrimary } from '../../../shared/ui/shell-layout-tokens';
import { ShellPagination } from '../../../shared/ui/ShellPagination';

type Props = {
  contacts: Contact[];
  createMode: boolean;
  formState: ContactFormStateResult;
  isPending: boolean;
  onDelete: (contact: Contact) => void;
  onFormSubmit: () => void;
  pageState: ContactsPageStateResult;
};

export function ContactsSections({
  contacts,
  createMode,
  formState,
  isPending,
  onDelete,
  onFormSubmit,
  pageState,
}: Props) {
  const withEmail = contacts.filter((contact) => contact.email).length;

  return (
    <section className={shellMainAsidePrimary}>
      <div className="rounded-[28px] border border-(--app-border) bg-(--app-surface-muted) p-5 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-(--app-text)">Contacts</div>
            <div className="mt-1 text-sm text-(--app-text-muted)">
              Create, update and remove saved payout recipients.
            </div>
          </div>
        </div>
        <ContactsSearchForm
          isSearchPending={pageState.isSearchPending}
          onApply={() => pageState.applyQuery(pageState.query)}
          onClear={() => {
            pageState.setQuery(``);
            pageState.applyQuery(``);
          }}
          onQueryChange={pageState.setQuery}
          query={pageState.query}
        />
        {createMode ? (
          <div className="mb-5 rounded-2xl border border-(--app-primary-soft) bg-(--app-primary-soft) px-4 py-3 text-sm text-(--app-primary)">
            Finish this contact to return to your saved start-payment draft.
          </div>
        ) : null}
        {formState.editingContactId && pageState.safeReturnTo ? (
          <div className="mb-5 rounded-2xl border border-(--app-primary-soft) bg-(--app-primary-soft) px-4 py-3 text-sm text-(--app-primary)">
            Edit this contact and you will be returned to the contract workspace after saving.
          </div>
        ) : null}
        {pageState.searchMode ? (
          <div className="mb-5 rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-sm text-(--app-text-soft)">
            Search results return only name and email from the backend search endpoint. Open a full record to review
            address details or related payment history.
          </div>
        ) : null}
        <ContactsFormSection
          cancelEditing={formState.cancelEditing}
          editingContactId={formState.editingContactId}
          form={formState.form}
          isPending={isPending}
          message={formState.message}
          onFormSubmit={onFormSubmit}
          setForm={formState.setForm}
          setMessage={formState.setMessage}
        />
        <ContactsListSection
          contacts={contacts}
          isPending={isPending}
          onDelete={onDelete}
          onEdit={formState.startEditing}
          pendingDeleteId={formState.pendingDeleteId}
          searchMode={pageState.searchMode}
        />
        {!pageState.searchMode ? (
          <ShellPagination
            disabled={pageState.isSearchPending}
            onNext={() => pageState.applyPage(pageState.page + 1)}
            onPrev={() => pageState.applyPage(pageState.page - 1)}
            page={pageState.page}
            totalPages={pageState.totalPages}
          />
        ) : null}
      </div>

      <ContactsSummaryPanel
        contactsLength={contacts.length}
        page={pageState.page}
        searchMode={pageState.searchMode}
        totalContacts={pageState.totalContacts}
        totalPages={pageState.totalPages}
        withAddress={pageState.withAddress}
        withEmail={withEmail}
      />
    </section>
  );
}
