'use client';

import Link from 'next/link';

import { displayContactAddress, type Contact, type ContactFormStateResult } from './contact-form-state';
import { type ContactsPageStateResult } from './contacts-page-state';
import { shellMainAsidePrimary } from '../../../shared/ui/shell-layout-tokens';
import { ActionMini } from '../../../shared/ui/shell-primitives';

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
        <div className="mb-5 rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_auto_auto]">
            <input
              value={pageState.query}
              onChange={(event) => pageState.setQuery(event.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
            />
            <button
              type="button"
              disabled={pageState.isSearchPending}
              onClick={() => pageState.applyQuery(pageState.query)}
              className="rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
            >
              {pageState.isSearchPending ? `Applying...` : `Search`}
            </button>
            <button
              type="button"
              disabled={pageState.isSearchPending}
              onClick={() => {
                pageState.setQuery(``);
                pageState.applyQuery(``);
              }}
              className="rounded-2xl border border-(--app-border) px-4 py-3 font-medium text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear
            </button>
          </div>
          <div className="mt-3 text-sm text-(--app-text-muted)">
            Search uses the backend contacts query contract and matches saved contact name or email only.
          </div>
        </div>
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
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="contact-email">
              Email
            </label>
            <input
              id="contact-email"
              type="email"
              value={formState.form.email}
              onChange={(event) => {
                formState.setForm((current) => ({ ...current, email: event.target.value }));
                formState.setMessage(null);
              }}
              className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
              placeholder="partner@example.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="contact-name">
              Name
            </label>
            <input
              id="contact-name"
              value={formState.form.name}
              onChange={(event) => {
                formState.setForm((current) => ({ ...current, name: event.target.value }));
                formState.setMessage(null);
              }}
              className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
              placeholder="Partner name"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="contact-street">
              Street
            </label>
            <input
              id="contact-street"
              value={formState.form.street}
              onChange={(event) => {
                formState.setForm((current) => ({ ...current, street: event.target.value }));
                formState.setMessage(null);
              }}
              className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
              placeholder="221B Baker Street"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="contact-city">
              City
            </label>
            <input
              id="contact-city"
              value={formState.form.city}
              onChange={(event) => {
                formState.setForm((current) => ({ ...current, city: event.target.value }));
                formState.setMessage(null);
              }}
              className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
              placeholder="London"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="contact-state">
              State / Region
            </label>
            <input
              id="contact-state"
              value={formState.form.state}
              onChange={(event) => {
                formState.setForm((current) => ({ ...current, state: event.target.value }));
                formState.setMessage(null);
              }}
              className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
              placeholder="Greater London"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="contact-postal-code">
              Postal code
            </label>
            <input
              id="contact-postal-code"
              value={formState.form.postalCode}
              onChange={(event) => {
                formState.setForm((current) => ({ ...current, postalCode: event.target.value }));
                formState.setMessage(null);
              }}
              className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
              placeholder="NW1 6XE"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-(--app-text-muted)" htmlFor="contact-country">
              Country
            </label>
            <input
              id="contact-country"
              value={formState.form.country}
              onChange={(event) => {
                formState.setForm((current) => ({ ...current, country: event.target.value }));
                formState.setMessage(null);
              }}
              className="w-full rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 text-(--app-text) outline-none placeholder:text-(--app-text-faint)"
              placeholder="United Kingdom"
            />
          </div>
        </div>
        {formState.message ? (
          <div
            className={
              formState.message.type === `error`
                ? `mb-4 rounded-2xl border border-(--app-danger-soft) bg-(--app-danger-soft) px-4 py-3 text-sm text-(--app-danger-text)`
                : `mb-4 rounded-2xl border border-(--app-success-soft) bg-(--app-success-soft) px-4 py-3 text-sm text-(--app-success-text)`
            }
          >
            {formState.message.text}
          </div>
        ) : null}
        <button
          type="button"
          disabled={isPending}
          onClick={onFormSubmit}
          className="mb-5 rounded-2xl bg-(--app-primary) px-4 py-3 font-medium text-(--app-text) disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? `Saving...` : formState.editingContactId ? `Save changes` : `Add contact`}
        </button>
        {formState.editingContactId ? (
          <button
            type="button"
            disabled={isPending}
            onClick={formState.cancelEditing}
            className="mb-5 ml-3 rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-3 font-medium text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel edit
          </button>
        ) : null}
        {contacts.length === 0 ? (
          <div className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) px-4 py-10 text-center text-sm text-(--app-text-muted)">
            {pageState.searchMode ? `No contacts match the current search.` : `No contacts saved yet.`}
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded-2xl border border-(--app-border) bg-(--app-surface-muted) p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-(--app-text)">
                      {contact.name || contact.email || `Unnamed contact`}
                    </div>
                    <div className="mt-1 text-sm text-(--app-text-muted)">
                      {pageState.searchMode
                        ? `Matched by backend search on saved contact name or email`
                        : displayContactAddress(contact)}
                    </div>
                    <div className="mt-2 text-sm text-(--app-primary)">{contact.email || `No email`}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/contacts/${contact.id}/details`}
                      className="rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft) transition hover:border-(--app-border-strong) hover:bg-(--app-surface-muted)"
                    >
                      View details
                    </Link>
                    {pageState.searchMode ? null : (
                      <>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => formState.startEditing(contact)}
                          className="rounded-xl border border-(--app-primary-soft) px-3 py-2 text-sm text-(--app-primary) disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => onDelete(contact)}
                          className="rounded-xl border border-(--app-danger-soft) px-3 py-2 text-sm text-(--app-danger-text) disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {formState.pendingDeleteId === contact.id ? `Deleting...` : `Delete`}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!pageState.searchMode ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={pageState.isSearchPending || pageState.page <= 1}
              onClick={() => pageState.applyPage(pageState.page - 1)}
              className="rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={pageState.isSearchPending || pageState.page >= pageState.totalPages}
              onClick={() => pageState.applyPage(pageState.page + 1)}
              className="rounded-xl border border-(--app-border) px-3 py-2 text-sm text-(--app-text-soft) disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-[28px] border border-(--app-border) bg-(--app-surface-muted) p-5 backdrop-blur">
        <div className="mb-4 text-lg font-semibold text-(--app-text)">Contact summary</div>
        <div className="space-y-3">
          <ActionMini
            label={
              pageState.searchMode
                ? `${contacts.length} matching contacts`
                : `Page ${pageState.page} of ${pageState.totalPages} · ${contacts.length} shown · ${pageState.totalContacts} saved contacts`
            }
          />
          <ActionMini
            label={
              pageState.searchMode
                ? `Search matches are limited to name and email`
                : `${pageState.withAddress} with address details`
            }
          />
          <ActionMini
            label={
              pageState.searchMode
                ? `Clear search to edit or delete from the full list`
                : `${contacts.filter((contact) => contact.email).length} with email available`
            }
          />
        </div>
      </div>
    </section>
  );
}
