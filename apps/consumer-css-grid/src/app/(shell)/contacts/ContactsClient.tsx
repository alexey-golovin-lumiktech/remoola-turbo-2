'use client';

import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState, useTransition } from 'react';

import { sanitizeContactsReturnTo } from './contacts-return-to';
import {
  createContactMutation,
  deleteContactMutation,
  updateContactMutation,
} from '../../../lib/consumer-mutations.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';
import { ActionMini } from '../../../shared/ui/shell-primitives';

type Contact = {
  id: string;
  email?: string | null;
  name?: string | null;
  address?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
};

type Props = {
  contacts: Contact[];
  createMode?: boolean;
  initialEmail?: string;
  returnTo?: string;
  initialQuery?: string;
  searchMode?: boolean;
  totalContacts?: number;
  page?: number;
  pageSize?: number;
};

function displayAddress(contact: Contact) {
  const parts = [
    contact.address?.street,
    contact.address?.city,
    contact.address?.state,
    contact.address?.postalCode,
    contact.address?.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(`, `) : `No address details`;
}

export function ContactsClient({
  contacts,
  createMode = false,
  initialEmail = ``,
  returnTo = ``,
  initialQuery = ``,
  searchMode = false,
  totalContacts = contacts.length,
  page = 1,
  pageSize = 20,
}: Props) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isSearchPending, startSearchTransition] = useTransition();
  const [form, setForm] = useState({
    email: initialEmail,
    name: ``,
    street: ``,
    city: ``,
    state: ``,
    postalCode: ``,
    country: ``,
  });
  const [query, setQuery] = useState(initialQuery);
  const [message, setMessage] = useState<{ type: `error` | `success`; text: string } | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);
  const totalPages = Math.max(1, Math.ceil(totalContacts / pageSize));

  const withAddress = contacts.filter((contact) => {
    const address = contact.address;
    return Boolean(address?.city || address?.country || address?.street || address?.postalCode || address?.state);
  }).length;

  const resetForm = () =>
    setForm({
      email: createMode ? initialEmail : ``,
      name: ``,
      street: ``,
      city: ``,
      state: ``,
      postalCode: ``,
      country: ``,
    });

  const applyQuery = (nextQuery: string) => {
    const params = new URLSearchParams(searchParams.toString());
    const trimmedQuery = nextQuery.trim();
    if (trimmedQuery) {
      params.set(`query`, trimmedQuery);
    } else {
      params.delete(`query`);
    }
    params.delete(`page`);
    params.delete(`pageSize`);
    startSearchTransition(() => {
      const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
      router.push(nextUrl);
    });
  };

  const applyPage = (nextPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(`page`, String(nextPage));
    params.set(`pageSize`, String(pageSize));
    const nextUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(nextUrl);
  };

  return (
    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <div className="text-lg font-semibold text-white/90">Contacts</div>
            <div className="mt-1 text-sm text-white/45">Create, update and remove saved payout recipients.</div>
          </div>
        </div>
        <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr_auto_auto]">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search by name or email"
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
            />
            <button
              type="button"
              disabled={isSearchPending}
              onClick={() => applyQuery(query)}
              className="rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSearchPending ? `Applying...` : `Search`}
            </button>
            <button
              type="button"
              disabled={isSearchPending}
              onClick={() => {
                setQuery(``);
                applyQuery(``);
              }}
              className="rounded-2xl border border-white/10 px-4 py-3 font-medium text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Clear
            </button>
          </div>
          <div className="mt-3 text-sm text-white/45">
            Search uses the backend contacts query contract and matches saved contact name or email only.
          </div>
        </div>
        {createMode ? (
          <div className="mb-5 rounded-2xl border border-blue-400/20 bg-blue-500/10 px-4 py-3 text-sm text-blue-100">
            Finish this contact to return to your saved start-payment draft.
          </div>
        ) : null}
        {searchMode ? (
          <div className="mb-5 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/60">
            Search results return only name and email from the backend search endpoint. Open a full record to review
            address details or related payment history.
          </div>
        ) : null}
        <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label className="mb-2 block text-sm text-white/55" htmlFor="contact-email">
              Email
            </label>
            <input
              id="contact-email"
              type="email"
              value={form.email}
              onChange={(event) => {
                setForm((current) => ({ ...current, email: event.target.value }));
                setMessage(null);
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
              placeholder="partner@example.com"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/55" htmlFor="contact-name">
              Name
            </label>
            <input
              id="contact-name"
              value={form.name}
              onChange={(event) => {
                setForm((current) => ({ ...current, name: event.target.value }));
                setMessage(null);
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
              placeholder="Partner name"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/55" htmlFor="contact-street">
              Street
            </label>
            <input
              id="contact-street"
              value={form.street}
              onChange={(event) => {
                setForm((current) => ({ ...current, street: event.target.value }));
                setMessage(null);
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
              placeholder="221B Baker Street"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/55" htmlFor="contact-city">
              City
            </label>
            <input
              id="contact-city"
              value={form.city}
              onChange={(event) => {
                setForm((current) => ({ ...current, city: event.target.value }));
                setMessage(null);
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
              placeholder="London"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/55" htmlFor="contact-state">
              State / Region
            </label>
            <input
              id="contact-state"
              value={form.state}
              onChange={(event) => {
                setForm((current) => ({ ...current, state: event.target.value }));
                setMessage(null);
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
              placeholder="Greater London"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/55" htmlFor="contact-postal-code">
              Postal code
            </label>
            <input
              id="contact-postal-code"
              value={form.postalCode}
              onChange={(event) => {
                setForm((current) => ({ ...current, postalCode: event.target.value }));
                setMessage(null);
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
              placeholder="NW1 6XE"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm text-white/55" htmlFor="contact-country">
              Country
            </label>
            <input
              id="contact-country"
              value={form.country}
              onChange={(event) => {
                setForm((current) => ({ ...current, country: event.target.value }));
                setMessage(null);
              }}
              className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/25"
              placeholder="United Kingdom"
            />
          </div>
        </div>
        {message ? (
          <div
            className={
              message.type === `error`
                ? `mb-4 rounded-2xl border border-rose-400/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200`
                : `mb-4 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200`
            }
          >
            {message.text}
          </div>
        ) : null}
        <button
          type="button"
          disabled={isPending}
          onClick={() => {
            setMessage(null);
            startTransition(async () => {
              const result = editingContactId
                ? await updateContactMutation(editingContactId, form)
                : await createContactMutation(form);
              if (!result.ok) {
                if (handleSessionExpiredError(result.error)) return;
                setMessage({ type: `error`, text: result.error.message });
                return;
              }
              resetForm();
              setEditingContactId(null);
              const safeReturnTo = sanitizeContactsReturnTo(returnTo);
              if (!editingContactId && createMode && safeReturnTo) {
                router.push(safeReturnTo);
                return;
              }
              setMessage({
                type: `success`,
                text: result.message ?? (editingContactId ? `Contact updated` : `Contact created`),
              });
              router.refresh();
            });
          }}
          className="mb-5 rounded-2xl bg-blue-500 px-4 py-3 font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? `Saving...` : editingContactId ? `Save changes` : `Add contact`}
        </button>
        {editingContactId ? (
          <button
            type="button"
            disabled={isPending}
            onClick={() => {
              setEditingContactId(null);
              resetForm();
              setMessage(null);
            }}
            className="mb-5 ml-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-medium text-white/80 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel edit
          </button>
        ) : null}
        {contacts.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-10 text-center text-sm text-white/45">
            {searchMode ? `No contacts match the current search.` : `No contacts saved yet.`}
          </div>
        ) : (
          <div className="space-y-3">
            {contacts.map((contact) => (
              <div key={contact.id} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="font-medium text-white/90">
                      {contact.name || contact.email || `Unnamed contact`}
                    </div>
                    <div className="mt-1 text-sm text-white/45">
                      {searchMode
                        ? `Matched by backend search on saved contact name or email`
                        : displayAddress(contact)}
                    </div>
                    <div className="mt-2 text-sm text-blue-300">{contact.email || `No email`}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Link
                      href={`/contacts/${contact.id}/details`}
                      className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/80 transition hover:border-white/20 hover:bg-white/8"
                    >
                      View details
                    </Link>
                    {searchMode ? null : (
                      <>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            setEditingContactId(contact.id);
                            setForm({
                              email: contact.email ?? ``,
                              name: contact.name ?? ``,
                              street: contact.address?.street ?? ``,
                              city: contact.address?.city ?? ``,
                              state: contact.address?.state ?? ``,
                              postalCode: contact.address?.postalCode ?? ``,
                              country: contact.address?.country ?? ``,
                            });
                            setMessage(null);
                          }}
                          className="rounded-xl border border-blue-400/20 px-3 py-2 text-sm text-blue-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          disabled={isPending}
                          onClick={() => {
                            setMessage(null);
                            setPendingDeleteId(contact.id);
                            startTransition(async () => {
                              const result = await deleteContactMutation(contact.id);
                              setPendingDeleteId(null);
                              if (!result.ok) {
                                if (handleSessionExpiredError(result.error)) return;
                                setMessage({ type: `error`, text: result.error.message });
                                return;
                              }
                              if (editingContactId === contact.id) {
                                setEditingContactId(null);
                                resetForm();
                              }
                              setMessage({ type: `success`, text: result.message ?? `Contact deleted` });
                              router.refresh();
                            });
                          }}
                          className="rounded-xl border border-rose-400/20 px-3 py-2 text-sm text-rose-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {pendingDeleteId === contact.id ? `Deleting...` : `Delete`}
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {!searchMode ? (
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isSearchPending || page <= 1}
              onClick={() => applyPage(page - 1)}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={isSearchPending || page >= totalPages}
              onClick={() => applyPage(page + 1)}
              className="rounded-xl border border-white/10 px-3 py-2 text-sm text-white/75 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-[28px] border border-white/10 bg-white/6 p-5 backdrop-blur">
        <div className="mb-4 text-lg font-semibold text-white/90">Contact summary</div>
        <div className="space-y-3">
          <ActionMini
            label={
              searchMode
                ? `${contacts.length} matching contacts`
                : `Page ${page} of ${totalPages} · ${contacts.length} shown · ${totalContacts} saved contacts`
            }
          />
          <ActionMini
            label={searchMode ? `Search matches are limited to name and email` : `${withAddress} with address details`}
          />
          <ActionMini
            label={
              searchMode
                ? `Clear search to edit or delete from the full list`
                : `${contacts.filter((contact) => contact.email).length} with email available`
            }
          />
        </div>
      </div>
    </section>
  );
}
