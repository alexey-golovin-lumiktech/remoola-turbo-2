'use client';

import { useSearchParams, useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';

import { ContactsTable } from './ContactsTable';
import { CreateContactModal, DeleteContactModal, EditContactModal } from './modals';
import { type ConsumerContact } from '../../types';
import styles from '../ui/classNames.module.css';

const {
  cardBaseSoftCompact,
  contactsAddButton,
  contactsPageContainer,
  contactsPageHeader,
  contactsPageSubtitle,
  contactsPageTitle,
} = styles;

export function ContactsPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [items, setItems] = useState<ConsumerContact[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [createInitialEmail, setCreateInitialEmail] = useState<string | null>(null);
  const [returnToPath, setReturnToPath] = useState<string | null>(null);
  const [editContact, setEditContact] = useState<ConsumerContact | null>(null);
  const [deleteContact, setDeleteContact] = useState<ConsumerContact | null>(null);

  const refresh = useCallback(async () => {
    const response = await fetch(`/api/contacts`, {
      method: `GET`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      cache: `no-store`,
    });
    if (!response.ok) throw new Error(`Something went wrong retrieve contacts`);
    const json = await response.json();
    setItems(json.items);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    const shouldOpenCreate = searchParams.get(`create`) === `1`;
    if (!shouldOpenCreate) return;

    const prefillEmail = searchParams.get(`email`);
    const returnTo = searchParams.get(`returnTo`);

    setCreateInitialEmail(prefillEmail);
    setReturnToPath(returnTo);
    setCreateOpen(true);
    router.replace(`/contacts`);
  }, [searchParams, router]);

  return (
    <div className={contactsPageContainer}>
      <div className={contactsPageHeader}>
        <div>
          <h1 className={contactsPageTitle}>Contacts</h1>
          <p className={contactsPageSubtitle}>Saved contractors and business contacts.</p>
        </div>

        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setCreateInitialEmail(null);
            setReturnToPath(null);
            setCreateOpen(true);
          }}
          className={contactsAddButton}
        >
          + Add Contact
        </button>
      </div>

      <div className={cardBaseSoftCompact}>
        <ContactsTable
          items={items}
          onEditAction={(contact) => setEditContact(contact)}
          onDeleteAction={(contact) => setDeleteContact(contact)}
          onDetailsAction={(contact) => router.push(`contacts/${contact.id}/details`)}
        />
      </div>

      {/* Modals */}
      <CreateContactModal
        open={createOpen}
        initialEmail={createInitialEmail}
        onCloseAction={() => {
          setCreateOpen(false);
          setCreateInitialEmail(null);
          setReturnToPath(null);
        }}
        onCreatedAction={async () => {
          await refresh();
          if (returnToPath) {
            router.push(returnToPath);
            return;
          }
          setReturnToPath(null);
        }}
      />

      <EditContactModal
        open={!!editContact}
        contact={editContact}
        onCloseAction={() => setEditContact(null)}
        onUpdatedAction={refresh}
      />

      <DeleteContactModal
        open={!!deleteContact}
        contact={deleteContact}
        onCloseAction={() => setDeleteContact(null)}
        onDeletedAction={refresh}
      />
    </div>
  );
}
