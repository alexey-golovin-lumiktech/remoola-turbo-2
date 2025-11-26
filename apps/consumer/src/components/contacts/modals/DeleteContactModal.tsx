'use client';

import { type ConsumerContact } from '../../../types';

export default function DeleteContactModal({
  open,
  onCloseAction,
  contact,
  onDeletedAction,
}: {
  open: boolean;
  onCloseAction: () => void;
  contact: ConsumerContact | null;
  onDeletedAction: () => void;
}) {
  if (!open || !contact) return null;

  async function remove() {
    const res = await fetch(`/api/contacts/${contact!.id}`, {
      method: `DELETE`,
      credentials: `include`,
      headers: { 'Content-Type': `application/json`, authorization: localStorage.getItem(`authorization`)! },
    });
    if (res.ok) {
      onDeletedAction();
      onCloseAction();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
      <div className="bg-white rounded-xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-semibold">Delete Contact</h2>
        <p className="text-sm text-gray-600 py-2">
          Are you sure you want to delete &quot;{contact.name ?? contact.email}"?
        </p>

        <div className="flex justify-end gap-2 mt-4">
          <button onClick={onCloseAction}>Cancel</button>
          <button onClick={remove} className="px-4 py-2 bg-red-600 text-white rounded">
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
