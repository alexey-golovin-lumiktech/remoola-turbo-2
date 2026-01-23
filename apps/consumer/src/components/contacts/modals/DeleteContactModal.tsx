'use client';

import { type ConsumerContact } from '../../../types';

type DeleteContactModalProps = {
  open: boolean;
  onCloseAction: () => void;
  contact: ConsumerContact | null;
  onDeletedAction: () => void;
};

export function DeleteContactModal({ open, onCloseAction, contact, onDeletedAction }: DeleteContactModalProps) {
  if (!open || !contact) return null;

  async function remove() {
    const res = await fetch(`/api/contacts/${contact!.id}`, {
      method: `DELETE`,
      headers: { 'content-type': `application/json` },
      credentials: `include`,
    });
    if (res.ok) {
      onDeletedAction();
      onCloseAction();
    }
    const parsed = JSON.parse((await res.text()) || `{}`);
    alert(`An unexpected error occurred: ${parsed?.message || res.statusText}`);
  }

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex justify-center items-center">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Delete Contact</h2>
        <p className="text-sm text-gray-600 dark:text-gray-300 py-2">
          Are you sure you want to delete &quot;{contact.name ?? contact.email}&quot;?
        </p>

        <div className="flex justify-end gap-2 mt-4">
          <button
            onClick={onCloseAction}
            className="px-3 py-2 rounded text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button onClick={remove} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 dark:hover:bg-red-500">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
