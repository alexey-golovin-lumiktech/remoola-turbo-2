'use client';

import Link from 'next/link';

import { displayContactAddress, type Contact } from './contact-form-state';
import { shellContainerBase, shellEmptyState } from '../../../shared/ui/shell-card-tokens';

export function ContactsListSection({
  contacts,
  isPending,
  onDelete,
  onEdit,
  pendingDeleteId,
  searchMode,
}: {
  contacts: Contact[];
  isPending: boolean;
  onDelete: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
  pendingDeleteId: string | null;
  searchMode: boolean;
}) {
  if (contacts.length === 0) {
    return (
      <div className={shellEmptyState}>
        {searchMode ? `No contacts match the current search.` : `No contacts saved yet.`}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {contacts.map((contact) => (
        <div key={contact.id} className={shellContainerBase}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="font-medium text-(--app-text)">{contact.name || contact.email || `Unnamed contact`}</div>
              <div className="mt-1 text-sm text-(--app-text-muted)">
                {searchMode
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
              {searchMode ? null : (
                <>
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => onEdit(contact)}
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
                    {pendingDeleteId === contact.id ? `Deleting...` : `Delete`}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
