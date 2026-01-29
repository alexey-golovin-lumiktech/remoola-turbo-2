'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

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
  const [items, setItems] = useState<ConsumerContact[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editContact, setEditContact] = useState<ConsumerContact | null>(null);
  const [deleteContact, setDeleteContact] = useState<ConsumerContact | null>(null);

  async function refresh() {
    const response = await fetch(`/api/contacts`, {
      method: `GET`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
      cache: `no-store`,
    });
    if (!response.ok) throw new Error(`Something went wrong retrieve contacts`);
    const json = await response.json();
    setItems(json.items);
  }

  useEffect(() => void refresh(), []);

  return (
    <div className={contactsPageContainer}>
      <div className={contactsPageHeader}>
        <div>
          <h1 className={contactsPageTitle}>Contacts</h1>
          <p className={contactsPageSubtitle}>Saved contractors and business contacts.</p>
        </div>

        <button
          onClick={(e) => (e.preventDefault(), e.stopPropagation(), setCreateOpen(true))}
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
      <CreateContactModal open={createOpen} onCloseAction={() => setCreateOpen(false)} onCreatedAction={refresh} />

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
