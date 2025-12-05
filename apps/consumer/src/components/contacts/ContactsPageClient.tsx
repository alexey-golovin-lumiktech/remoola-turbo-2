'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ContactsTable } from './ContactsTable';
import { CreateContactModal, DeleteContactModal, EditContactModal } from './modals';
import { type ConsumerContact } from '../../types';

export function ContactsPageClient() {
  const router = useRouter();
  const [items, setItems] = useState<ConsumerContact[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [editContact, setEditContact] = useState<ConsumerContact | null>(null);
  const [deleteContact, setDeleteContact] = useState<ConsumerContact | null>(null);

  async function refresh() {
    const response = await fetch(`/api/contacts`, {
      method: `GET`,
      credentials: `include`,
      cache: `no-store`,
    });
    if (!response.ok) throw new Error(`Something went wrong retrieve contacts`);
    const json = await response.json();
    setItems(json.items);
  }

  useEffect(() => void refresh(), []);

  return (
    <div className="flex flex-col gap-6 px-8 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Contacts</h1>
          <p className="text-sm text-gray-500">Saved contractors and business contacts.</p>
        </div>

        <button
          onClick={() => setCreateOpen(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow-sm hover:bg-blue-700 transition"
        >
          + Add Contact
        </button>
      </div>

      <div className="rounded-2xl bg-white/90 p-4 shadow-sm">
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
