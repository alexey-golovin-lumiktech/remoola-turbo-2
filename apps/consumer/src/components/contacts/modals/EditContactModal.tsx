'use client';

import { useEffect, useState } from 'react';

import { type ConsumerContactAddress, type ConsumerContact } from '../../../types';

export function EditContactModal({
  open,
  onCloseAction,
  onUpdatedAction,
  contact,
}: {
  open: boolean;
  onCloseAction: () => void;
  contact: ConsumerContact | null;
  onUpdatedAction: () => void;
}) {
  const [name, setName] = useState(contact?.name ?? ``);
  const [email, setEmail] = useState(contact?.email ?? ``);
  const [address, setAddress] = useState<ConsumerContactAddress>({
    street: ``,
    city: ``,
    state: ``,
    postalCode: ``,
    country: ``,
  });

  useEffect(() => {
    if (contact) {
      setName(contact.name ?? ``);
      setEmail(contact.email);

      setAddress({
        street: contact.address?.street ?? ``,
        city: contact.address?.city ?? ``,
        state: contact.address?.state ?? ``,
        postalCode: contact.address?.postalCode ?? ``,
        country: contact.address?.country ?? ``,
      });
    }
  }, [contact]);

  if (!open || !contact) return null;

  async function update() {
    const res = await fetch(`/api/contacts/${contact!.id}`, {
      method: `PATCH`,
      body: JSON.stringify({ name, email, address }),
      credentials: `include`,
    });

    if (res.ok) {
      onUpdatedAction();
      onCloseAction();
    }
  }

  function updateAddress(field: string, value: string) {
    setAddress((prev) => ({ ...prev, [field]: value }));
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex justify-center items-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md space-y-4">
        <h2 className="text-xl font-semibold">Edit Contact</h2>

        {/* Contact name */}
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border rounded-lg p-2"
        />

        {/* Email */}
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg p-2"
        />

        {/* Address Section */}
        {/* <div className="grid grid-cols-2 gap-3"> */}
        <input
          placeholder="Street"
          value={address.street}
          onChange={(e) => updateAddress(`street`, e.target.value)}
          className="w-full border rounded-lg p-2"
        />

        <input
          placeholder="City"
          value={address.city}
          onChange={(e) => updateAddress(`city`, e.target.value)}
          className="w-full border rounded-lg p-2"
        />

        <input
          placeholder="State"
          value={address.state}
          onChange={(e) => updateAddress(`state`, e.target.value)}
          className="w-full border rounded-lg p-2"
        />

        <input
          placeholder="Postal Code"
          value={address.postalCode}
          onChange={(e) => updateAddress(`postalCode`, e.target.value)}
          className="w-full border rounded-lg p-2"
        />

        <input
          placeholder="Country"
          value={address.country}
          onChange={(e) => updateAddress(`country`, e.target.value)}
          className="w-full border rounded-lg p-2"
        />
        {/* </div> */}

        {/* Buttons */}
        <div className="flex justify-end gap-2 pt-4">
          <button onClick={onCloseAction} className="px-4 py-2 rounded-lg hover:bg-gray-100 transition">
            Cancel
          </button>

          <button onClick={update} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
