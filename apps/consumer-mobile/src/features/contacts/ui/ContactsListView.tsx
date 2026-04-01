'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useEffect, useState, useTransition } from 'react';

import styles from './ContactsListView.module.css';
import { CreateContactModal, type CreateContactData } from './CreateContactModal';
import { DeleteContactModal } from './DeleteContactModal';
import { EditContactModal, type EditContactData } from './EditContactModal';
import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { useDebounce } from '../../../shared/hooks/useDebounce';
import { Avatar } from '../../../shared/ui/Avatar';
import { Button } from '../../../shared/ui/Button';
import { EmptyState } from '../../../shared/ui/EmptyState';
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
import { type Contact } from '../schemas';

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
      throw new Error(
        getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.CONTACT_UNEXPECTED_ERROR)),
      );
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
      throw new Error(
        getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.CONTACT_UNEXPECTED_ERROR)),
      );
    }
    startTransition(() => {
      router.refresh();
    });
    setEditContact(null);
  };

  const handleDeleteContact = async (contactId: string) => {
    const result = await deleteContactAction(contactId);
    if (!result.ok) {
      throw new Error(
        getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.CONTACT_UNEXPECTED_ERROR)),
      );
    }
    startTransition(() => {
      router.refresh();
    });
    setDeleteContact(null);
  };

  return (
    <div className={styles.pageBg} data-testid="consumer-mobile-contacts-list">
      <PageHeader
        icon={<IconBadge icon={<UsersIcon className={styles.headerIcon} />} hasRing />}
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
            className={styles.addBtn}
          >
            <PlusIcon className={styles.addBtnIcon} />
            <span className={styles.addBtnText}>Add Contact</span>
          </Button>
        }
      />

      <div className={styles.main}>
        {contacts.length > 0 ? (
          <SearchInput
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by name, email, or ID..."
          />
        ) : null}

        {contacts.length === 0 ? (
          <EmptyState
            icon={<UsersIcon className={`h-8 w-8 text-slate-400 dark:text-slate-500`} strokeWidth={1.5} />}
            title="No contacts yet"
            description="Add contacts to easily send payments and manage your network."
            action={{
              label: `Add your first contact`,
              onClick: () => {
                setInitialEmail(null);
                setCreateModalOpen(true);
              },
            }}
          />
        ) : filteredContacts.length === 0 ? (
          <EmptyState
            icon={<SearchIcon className={`h-8 w-8 text-slate-400 dark:text-slate-500`} />}
            title="No results found"
            description={`No contacts found matching "${searchQuery}". Try adjusting your search or add a new contact.`}
            action={{
              label: `Add contact`,
              onClick: () => {
                setInitialEmail(null);
                setCreateModalOpen(true);
              },
            }}
          />
        ) : (
          <div className={styles.list}>
            {filteredContacts.map((c, index) => (
              <div key={c.id} className={styles.card} style={{ animationDelay: `${index * 30}ms` }}>
                <div className={styles.cardAccent} />

                <Link href={`/contacts/${c.id}/details`} className={styles.cardLink}>
                  <div className={styles.cardRow}>
                    <div className={styles.avatarWrap}>
                      <Avatar name={c.name ?? undefined} email={c.email ?? undefined} size="lg" />
                      <div className={styles.checkBadge}>
                        <CheckIcon className={styles.checkIcon} />
                      </div>
                    </div>
                    <div className={styles.cardContent}>
                      <div className={styles.cardHeaderRow}>
                        <div className={styles.cardHeaderLeft}>
                          <p className={styles.cardTitle}>{c.name ?? c.email ?? `Contact`}</p>
                          {c.email && c.name ? <p className={styles.cardEmail}>{c.email}</p> : null}
                          <p className={styles.cardId}>ID: {c.id.slice(0, 8)}...</p>
                        </div>
                        <ChevronRightIcon className={styles.chevron} />
                      </div>
                    </div>
                  </div>
                </Link>

                <div className={styles.cardActions}>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setEditContact(c);
                    }}
                    className={styles.actionBtn}
                  >
                    <PencilIcon className={styles.actionBtnIcon} strokeWidth={2} />
                    Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDeleteContact(c);
                    }}
                    className={styles.actionBtnDelete}
                  >
                    <TrashIcon className={styles.actionBtnIcon} strokeWidth={2} />
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
