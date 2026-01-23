'use client';

import { useState } from 'react';

import { type IAddressDetails } from '../../../types';

type CreateContactModalProps = { open: boolean; onCloseAction: () => void; onCreatedAction: () => void };

export function CreateContactModal({ open, onCloseAction, onCreatedAction }: CreateContactModalProps) {
  const [email, setEmail] = useState<string | null>(null);
  const [name, setName] = useState<string | null>(null);
  const [address, setAddress] = useState<IAddressDetails>({
    postalCode: null,
    country: null,
    state: null,
    city: null,
    street: null,
  });

  if (!open) return null;

  async function create() {
    const res = await fetch(`/api/contacts`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({
        email: email?.trim() ?? null,
        name: name?.trim() ?? null,
        address: {
          postalCode: address.postalCode?.trim() ?? null,
          country: address.country?.trim() ?? null,
          state: address.state?.trim() ?? null,
          city: address.city?.trim() ?? null,
          street: address.street?.trim() ?? null,
        },
      }),
      credentials: `include`,
    });
    if (!res.ok) {
      const parsed = JSON.parse((await res.text()) || `{}`);
      return alert(`An unexpected error occurred: ${parsed?.message || res.statusText}`);
    }
    setEmail(null);
    setName(null);
    setAddress({
      postalCode: null,
      country: null,
      state: null,
      city: null,
      street: null,
    });
    onCreatedAction();
    onCloseAction();
  }

  return (
    <div className="fixed inset-0 bg-black/40 dark:bg-black/60 flex justify-center items-center">
      <div className="bg-white dark:bg-slate-800 rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Create Contact</h2>

        <input
          placeholder="Email"
          value={email || ``}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />

        <input
          placeholder="Name (optional)"
          value={name || ``}
          onChange={(e) => setName(e.target.value)}
          className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />

        <input
          placeholder="Street"
          value={address.street || ``}
          onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
          className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />

        <input
          placeholder="City"
          value={address.city || ``}
          onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
          className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />

        <input
          placeholder="State"
          value={address.state || ``}
          onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
          className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />

        <input
          placeholder="PostalCode"
          value={address.postalCode || ``}
          onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
          className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />

        <input
          placeholder="Country"
          value={address.country || ``}
          onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))}
          className="w-full border border-gray-300 dark:border-slate-600 rounded-lg p-2 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
        />

        <div className="flex justify-end gap-2">
          <button
            onClick={onCloseAction}
            className="px-4 py-2 rounded text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={create}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 dark:hover:bg-blue-500"
          >
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
