'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';

import { CreateContactModal, type CreateContactData } from './CreateContactModal';
import { DeleteContactModal } from './DeleteContactModal';
import { EditContactModal, type EditContactData } from './EditContactModal';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import { Avatar } from '../../../shared/ui/Avatar';
import { Button } from '../../../shared/ui/Button';
import { createContactAction, updateContactAction, deleteContactAction } from '../actions';

import type { Contact } from '../schemas';

interface ContactsListViewProps {
  contacts: Contact[];
}

export function ContactsListView({ contacts }: ContactsListViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [, startTransition] = useTransition();

  const [searchQuery, setSearchQuery] = useState(``);
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState(``);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editContact, setEditContact] = useState<Contact | null>(null);
  const [deleteContact, setDeleteContact] = useState<Contact | null>(null);
  const [initialEmail, setInitialEmail] = useState<string | null>(null);

  const debouncedSetSearch = useDebounce((value: string) => {
    setDebouncedSearchQuery(value);
  }, 300);

  useEffect(() => {
    const shouldOpenCreate = searchParams.get(`create`) === `1`;
    if (shouldOpenCreate) {
      const prefillEmail = searchParams.get(`email`);
      setInitialEmail(prefillEmail);
      setCreateModalOpen(true);
      router.replace(`/contacts`);
    }
  }, [searchParams, router]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      debouncedSetSearch(value);
    },
    [debouncedSetSearch],
  );

  const filteredContacts = contacts.filter((c) => {
    const query = debouncedSearchQuery.toLowerCase();
    if (!query) return true;
    return (
      c.name?.toLowerCase().includes(query) ||
      c.email?.toLowerCase().includes(query) ||
      c.id?.toLowerCase().includes(query)
    );
  });

  const handleCreateContact = async (data: CreateContactData) => {
    const result = await createContactAction(data);
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    startTransition(() => {
      router.refresh();
    });
    setCreateModalOpen(false);
    setInitialEmail(null);
  };

  const handleUpdateContact = async (contactId: string, data: EditContactData) => {
    const result = await updateContactAction(contactId, data);
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    startTransition(() => {
      router.refresh();
    });
    setEditContact(null);
  };

  const handleDeleteContact = async (contactId: string) => {
    const result = await deleteContactAction(contactId);
    if (!result.ok) {
      throw new Error(result.error.message);
    }
    startTransition(() => {
      router.refresh();
    });
    setDeleteContact(null);
  };

  return (
    <div
      className="
        space-y-6
      "
      data-testid="consumer-mobile-contacts-list"
    >
      <div
        className="
          flex
          flex-col
          items-stretch
          justify-between
          gap-4
          sm:flex-row
          sm:items-center
        "
      >
        <h1
          className="
            text-2xl
            font-bold
            text-slate-900
            dark:text-white
          "
        >
          Contacts
        </h1>
        <Button
          variant="primary"
          size="md"
          onClick={() => {
            setInitialEmail(null);
            setCreateModalOpen(true);
          }}
          className="
            min-h-[44px]
            w-full
            sm:w-auto
          "
        >
          <svg
            className="
              h-5
              w-5
            "
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span
            className="
              ml-2
            "
          >
            Add Contact
          </span>
        </Button>
      </div>

      {contacts.length > 0 && (
        <div
          className="
            relative
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              inset-y-0
              left-0
              flex
              items-center
              pl-3
            "
          >
            <svg
              className="
                h-5
                w-5
                text-slate-400
              "
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="search"
            placeholder="Search contacts..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="
              input
              min-h-[44px]
              w-full
              pl-10
            "
          />
        </div>
      )}

      {contacts.length === 0 ? (
        <div
          className="
            flex
            min-h-[300px]
            flex-col
            items-center
            justify-center
            rounded-2xl
            border-2
            border-dashed
            border-slate-200
            bg-slate-50/50
            px-6
            py-12
            text-center
            dark:border-slate-700
            dark:bg-slate-800/30
          "
        >
          <div
            className="
              mb-4
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-full
              bg-slate-100
              text-slate-400
              dark:bg-slate-800
              dark:text-slate-500
            "
          >
            <svg
              className="
                h-8
                w-8
              "
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
              />
            </svg>
          </div>
          <h3
            className="
              text-lg
              font-semibold
              text-slate-900
              dark:text-white
            "
          >
            No contacts yet
          </h3>
          <p
            className="
              mt-2
              max-w-sm
              text-sm
              text-slate-600
              dark:text-slate-400
            "
          >
            Add contacts to easily send payments and manage your network.
          </p>
          <div
            className="
              mt-6
            "
          >
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                setInitialEmail(null);
                setCreateModalOpen(true);
              }}
              className="
                min-h-[44px]
              "
            >
              Add your first contact
            </Button>
          </div>
        </div>
      ) : filteredContacts.length === 0 ? (
        <div
          className="
            rounded-lg
            border
            border-slate-200
            bg-slate-50
            p-8
            text-center
            dark:border-slate-700
            dark:bg-slate-800/50
          "
        >
          <p
            className="
              text-sm
              text-slate-600
              dark:text-slate-400
            "
          >
            No contacts found matching &quot;{searchQuery}&quot;
          </p>
        </div>
      ) : (
        <div
          className="
            grid
            gap-3
            sm:grid-cols-2
          "
        >
          {filteredContacts.map((c) => (
            <div
              key={c.id}
              className="
                group
                relative
                overflow-hidden
                rounded-xl
                border
                border-slate-200
                bg-white
                shadow-sm
                transition-all
                duration-200
                hover:shadow-md
                dark:border-slate-700
                dark:bg-slate-800
              "
            >
              <div
                className="
                  absolute
                  right-0
                  top-0
                  h-full
                  w-1
                  bg-primary-500
                  opacity-0
                  transition-opacity
                  duration-200
                  group-hover:opacity-100
                "
              />

              <Link
                href={`/contacts/${c.id}/details`}
                className="
                  block
                  p-4
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-3
                  "
                >
                  <Avatar name={c.name ?? undefined} email={c.email ?? undefined} size="md" />
                  <div
                    className="
                      min-w-0
                      flex-1
                    "
                  >
                    <p
                      className="
                        truncate
                        font-semibold
                        text-slate-900
                        dark:text-white
                      "
                    >
                      {c.name ?? c.email ?? c.id.slice(0, 8)}
                    </p>
                    {c.email && c.name && (
                      <p
                        className="
                          truncate
                          text-sm
                          text-slate-600
                          dark:text-slate-400
                        "
                      >
                        {c.email}
                      </p>
                    )}
                  </div>
                  <svg
                    className="
                      h-5
                      w-5
                      shrink-0
                      text-slate-400
                      transition-transform
                      duration-200
                      group-hover:translate-x-1
                    "
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>

              <div
                className="
                  flex
                  border-t
                  border-slate-200
                  dark:border-slate-700
                "
              >
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditContact(c);
                  }}
                  className="
                    flex
                    min-h-[44px]
                    flex-1
                    items-center
                    justify-center
                    gap-2
                    px-4
                    py-3
                    text-sm
                    font-medium
                    text-slate-700
                    transition-colors
                    hover:bg-slate-50
                    dark:text-slate-300
                    dark:hover:bg-slate-700
                  "
                >
                  <svg
                    className="
                      h-4
                      w-4
                    "
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    />
                  </svg>
                  Edit
                </button>
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setDeleteContact(c);
                  }}
                  className="
                    flex
                    min-h-[44px]
                    flex-1
                    items-center
                    justify-center
                    gap-2
                    border-l
                    border-slate-200
                    px-4
                    py-3
                    text-sm
                    font-medium
                    text-red-600
                    transition-colors
                    hover:bg-red-50
                    dark:border-slate-700
                    dark:text-red-400
                    dark:hover:bg-red-900/10
                  "
                >
                  <svg
                    className="
                      h-4
                      w-4
                    "
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                    />
                  </svg>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CreateContactModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setInitialEmail(null);
        }}
        onSubmit={handleCreateContact}
        initialEmail={initialEmail}
      />

      <EditContactModal
        isOpen={!!editContact}
        onClose={() => setEditContact(null)}
        onSubmit={handleUpdateContact}
        contact={editContact}
      />

      <DeleteContactModal
        isOpen={!!deleteContact}
        onClose={() => setDeleteContact(null)}
        onSubmit={() => {
          if (deleteContact) {
            return handleDeleteContact(deleteContact.id);
          }
          return Promise.resolve();
        }}
        contact={deleteContact}
      />
    </div>
  );
}
