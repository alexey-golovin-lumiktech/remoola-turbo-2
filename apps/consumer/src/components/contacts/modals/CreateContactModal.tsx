'use client';

import { useState } from 'react';

import { type IAddressDetails } from '../../../types';

export function CreateContactModal({
  open,
  onCloseAction,
  onCreatedAction: onCreated,
}: {
  open: boolean;
  onCloseAction: () => void;
  onCreatedAction: () => void;
}) {
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
    if (res.ok) {
      onCreated();
      onCloseAction();
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center">
      <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-xl font-semibold">Create Contact</h2>

        <input
          placeholder="Email"
          value={email || ``}
          onChange={(e) => setEmail(e.target.value || null)}
          className="w-full border rounded-lg p-2"
        />

        <input
          placeholder="Name (optional)"
          value={name || ``}
          onChange={(e) => setName(e.target.value || null)}
          className="w-full border rounded-lg p-2"
        />

        <input
          placeholder="Street"
          value={address.street || ``}
          onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value || null }))}
          className="w-full border rounded-lg p-2"
        />

        <input
          placeholder="City"
          value={address.city || ``}
          onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value || null }))}
          className="w-full border rounded-lg p-2"
        />

        <input
          placeholder="State"
          value={address.state || ``}
          onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value || null }))}
          className="w-full border rounded-lg p-2"
        />

        <input
          placeholder="PostalCode"
          value={address.postalCode || ``}
          onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value || null }))}
          className="w-full border rounded-lg p-2"
        />

        <input
          placeholder="Country"
          value={address.country || ``}
          onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value || null }))}
          className="w-full border rounded-lg p-2"
        />

        <div className="flex justify-end gap-2">
          <button onClick={onCloseAction} className="px-4 py-2">
            Cancel
          </button>
          <button onClick={create} className="px-4 py-2 bg-blue-600 text-white rounded">
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
