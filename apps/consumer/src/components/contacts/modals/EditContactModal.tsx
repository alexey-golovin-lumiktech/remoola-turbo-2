'use client';

import { useEffect, useState } from 'react';

import { type ConsumerContactAddress, type ConsumerContact } from '../../../types';
import {
  contactModalInput,
  modalButtonPrimary,
  modalButtonSecondary,
  modalContentMd,
  modalFooterActions,
  modalOverlayClass,
  modalTitleClass,
  spaceY4,
} from '../../ui/classNames';

type EditContactModalProps = {
  open: boolean;
  onCloseAction: () => void;
  contact: ConsumerContact | null;
  onUpdatedAction: () => void;
};

export function EditContactModal({ open, onCloseAction, onUpdatedAction, contact }: EditContactModalProps) {
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
      headers: { 'content-type': `application/json` },
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
    <div className={modalOverlayClass}>
      <div className={`${modalContentMd} ${spaceY4}`}>
        <h2 className={modalTitleClass}>Edit Contact</h2>

        {/* Contact name */}
        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={contactModalInput}
        />

        {/* Email */}
        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={contactModalInput}
        />

        {/* Address Section */}
        <input
          placeholder="Street"
          value={address.street}
          onChange={(e) => updateAddress(`street`, e.target.value)}
          className={contactModalInput}
        />

        <input
          placeholder="City"
          value={address.city}
          onChange={(e) => updateAddress(`city`, e.target.value)}
          className={contactModalInput}
        />

        <input
          placeholder="State"
          value={address.state}
          onChange={(e) => updateAddress(`state`, e.target.value)}
          className={contactModalInput}
        />

        <input
          placeholder="Postal Code"
          value={address.postalCode}
          onChange={(e) => updateAddress(`postalCode`, e.target.value)}
          className={contactModalInput}
        />

        <input
          placeholder="Country"
          value={address.country}
          onChange={(e) => updateAddress(`country`, e.target.value)}
          className={contactModalInput}
        />

        {/* Buttons */}
        <div className={modalFooterActions}>
          <button onClick={onCloseAction} className={modalButtonSecondary}>
            Cancel
          </button>

          <button onClick={update} className={modalButtonPrimary}>
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
