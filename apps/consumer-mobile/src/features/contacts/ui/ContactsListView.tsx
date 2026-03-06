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
import { IconBadge } from '../../../shared/ui/IconBadge';
import { CheckIcon } from '../../../shared/ui/icons/CheckIcon';
import { ChevronRightIcon } from '../../../shared/ui/icons/ChevronRightIcon';
import { PencilIcon } from '../../../shared/ui/icons/PencilIcon';
import { PlusIcon } from '../../../shared/ui/icons/PlusIcon';
import { SearchIcon } from '../../../shared/ui/icons/SearchIcon';
import { TrashIcon } from '../../../shared/ui/icons/TrashIcon';
import { UsersIcon } from '../../../shared/ui/icons/UsersIcon';
import { PageHeader } from '../../../shared/ui/PageHeader';
import { SearchInput } from '../../../shared/ui/SearchInput';
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
      className={`
        min-h-full
        bg-gradient-to-br
        from-slate-50
        via-white
        to-slate-50
        dark:from-slate-950
        dark:via-slate-900
        dark:to-slate-950
      `}
      data-testid="consumer-mobile-contacts-list"
    >
      <PageHeader
        icon={<IconBadge icon={<UsersIcon className={`h-6 w-6 text-white`} />} hasRing />}
        title="Contacts"
        subtitle={`${contacts.length} ${contacts.length === 1 ? `contact` : `contacts`} in your network`}
        actions={
          <Button
            variant="primary"
            size="md"
            onClick={() => {
              setInitialEmail(null);
              setCreateModalOpen(true);
            }}
            className={`
              min-h-11
              shadow-lg
              shadow-primary-500/30
              hover:shadow-xl
              hover:shadow-primary-500/40
              transition-all
              duration-200
              active:scale-95
            `}
          >
            <PlusIcon className={`h-5 w-5`} />
            <span className={`ml-2`}>Add Contact</span>
          </Button>
        }
      />

      <div
        className={`
        mx-auto
        max-w-6xl
        px-4
        pt-6
        pb-6
        sm:px-6
        sm:pt-8
        lg:px-8
        space-y-6
        animate-fadeIn
      `}
      >
        {contacts.length > 0 && (
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by name, email, or ID..."
          />
        )}

        {contacts.length === 0 ? (
          <div
            className={`
            animate-fadeIn
            rounded-2xl
            border-2
            border-dashed
            border-slate-200
            bg-gradient-to-br
            from-slate-50/50
            to-white/50
            dark:border-slate-700
            dark:from-slate-800/50
            dark:to-slate-900/50
            px-6
            py-16
            text-center
            shadow-inner
          `}
          >
            <div
              className={`
              mx-auto
              mb-6
              flex
              h-20
              w-20
              items-center
              justify-center
              rounded-3xl
              bg-gradient-to-br
              from-slate-100
              to-slate-200
              text-slate-400
              shadow-lg
              ring-8
              ring-slate-100/50
              dark:from-slate-700
              dark:to-slate-800
              dark:text-slate-500
              dark:ring-slate-800/50
            `}
            >
              <UsersIcon className={`h-10 w-10`} strokeWidth={1.5} />
            </div>
            <h3
              className={`
              text-xl
              font-bold
              text-slate-900
              dark:text-slate-100
            `}
            >
              No contacts yet
            </h3>
            <p
              className={`
              mt-3
              max-w-sm
              mx-auto
              text-base
              text-slate-600
              dark:text-slate-400
            `}
            >
              Add contacts to easily send payments and manage your network.
            </p>
            <div className={`mt-6`}>
              <Button
                variant="primary"
                size="md"
                onClick={() => {
                  setInitialEmail(null);
                  setCreateModalOpen(true);
                }}
                className={`
                  min-h-11
                  shadow-lg
                  shadow-primary-500/30
                  hover:shadow-xl
                  hover:shadow-primary-500/40
                  transition-all
                  duration-200
                  active:scale-95
                `}
              >
                <PlusIcon className={`h-5 w-5`} />
                <span className={`ml-2`}>Add your first contact</span>
              </Button>
            </div>
          </div>
        ) : filteredContacts.length === 0 ? (
          <div
            className={`
            animate-fadeIn
            rounded-2xl
            border
            border-slate-200
            bg-gradient-to-br
            from-slate-50
            to-white
            dark:border-slate-700
            dark:from-slate-800/50
            dark:to-slate-900/50
            p-8
            text-center
            shadow-sm
          `}
          >
            <div
              className={`
              mx-auto
              mb-4
              flex
              h-16
              w-16
              items-center
              justify-center
              rounded-2xl
              bg-slate-100
              dark:bg-slate-800
              shadow-md
            `}
            >
              <SearchIcon
                className={`
                h-8
                w-8
                text-slate-400
                dark:text-slate-500
              `}
              />
            </div>
            <h3
              className={`
              text-lg
              font-bold
              text-slate-900
              dark:text-slate-100
            `}
            >
              No results found
            </h3>
            <p
              className={`
              mt-2
              text-sm
              text-slate-600
              dark:text-slate-400
            `}
            >
              No contacts found matching &quot;{searchQuery}&quot;
            </p>
            <p
              className={`
              mt-1
              text-xs
              text-slate-500
              dark:text-slate-500
            `}
            >
              Try adjusting your search or add a new contact
            </p>
          </div>
        ) : (
          <div
            className={`
            grid
            gap-4
            sm:grid-cols-2
            lg:grid-cols-3
          `}
          >
            {filteredContacts.map((c, index) => (
              <div
                key={c.id}
                className={`
                  group
                  relative
                  overflow-hidden
                  rounded-2xl
                  border
                  border-slate-200
                  bg-white
                  shadow-sm
                  transition-all
                  duration-200
                  hover:shadow-lg
                  hover:border-slate-300
                  dark:border-slate-700
                  dark:bg-slate-800
                  dark:hover:border-slate-600
                  animate-fadeIn
                `}
                style={{ animationDelay: `${index * 30}ms` }}
              >
                <div
                  className={`
                  absolute
                  right-0
                  top-0
                  h-full
                  w-1
                  bg-gradient-to-b
                  from-primary-500
                  to-primary-600
                  opacity-0
                  transition-opacity
                  duration-200
                  group-hover:opacity-100
                `}
                />

                <Link href={`/contacts/${c.id}/details`} className={`block p-5`}>
                  <div className={`flex items-start gap-4`}>
                    <div className={`relative`}>
                      <Avatar name={c.name ?? undefined} email={c.email ?? undefined} size="lg" />
                      <div
                        className={`
                        absolute
                        -bottom-1
                        -right-1
                        flex
                        h-6
                        w-6
                        items-center
                        justify-center
                        rounded-full
                        bg-green-500
                        ring-2
                        ring-white
                        dark:ring-slate-800
                        shadow-sm
                      `}
                      >
                        <CheckIcon className={`h-3 w-3 text-white`} />
                      </div>
                    </div>
                    <div className={`min-w-0 flex-1`}>
                      <div
                        className={`
                        flex
                        items-start
                        justify-between
                        gap-2
                      `}
                      >
                        <div className={`min-w-0 flex-1`}>
                          <p
                            className={`
                            truncate
                            font-bold
                            text-slate-900
                            dark:text-white
                            text-base
                          `}
                          >
                            {c.name ?? c.email ?? `Contact`}
                          </p>
                          {c.email && c.name && (
                            <p
                              className={`
                              truncate
                              text-sm
                              text-slate-600
                              dark:text-slate-400
                              mt-0.5
                            `}
                            >
                              {c.email}
                            </p>
                          )}
                          <p
                            className={`
                            truncate
                            text-xs
                            text-slate-500
                            dark:text-slate-500
                            mt-1
                            font-mono
                          `}
                          >
                            ID: {c.id.slice(0, 8)}...
                          </p>
                        </div>
                        <ChevronRightIcon
                          className={`
                          h-5
                          w-5
                          shrink-0
                          text-slate-400
                          transition-all
                          duration-200
                          group-hover:translate-x-1
                          group-hover:text-primary-500
                        `}
                        />
                      </div>
                    </div>
                  </div>
                </Link>

                <div
                  className={`
                  flex
                  border-t
                  border-slate-200
                  dark:border-slate-700
                  bg-slate-50/50
                  dark:bg-slate-900/30
                `}
                >
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditContact(c);
                    }}
                    className={`
                      flex
                      min-h-11
                      flex-1
                      items-center
                      justify-center
                      gap-2
                      px-4
                      py-3
                      text-sm
                      font-semibold
                      text-slate-700
                      transition-all
                      hover:bg-slate-100
                      dark:text-slate-300
                      dark:hover:bg-slate-800/50
                      active:scale-95
                    `}
                  >
                    <PencilIcon className={`h-4 w-4`} strokeWidth={2} />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteContact(c);
                    }}
                    className={`
                      flex
                      min-h-11
                      flex-1
                      items-center
                      justify-center
                      gap-2
                      border-l
                      border-slate-200
                      px-4
                      py-3
                      text-sm
                      font-semibold
                      text-red-600
                      transition-all
                      hover:bg-red-50
                      dark:border-slate-700
                      dark:text-red-400
                      dark:hover:bg-red-900/20
                      active:scale-95
                    `}
                  >
                    <TrashIcon className={`h-4 w-4`} strokeWidth={2} />
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
