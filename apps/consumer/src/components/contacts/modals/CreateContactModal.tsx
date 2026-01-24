'use client';

import { useState } from 'react';

import { type IAddressDetails } from '../../../types';
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
    <div className={modalOverlayClass}>
      <div className={`${modalContentMd} ${spaceY4}`}>
        <h2 className={modalTitleClass}>Create Contact</h2>

        <input
          placeholder="Email"
          value={email || ``}
          onChange={(e) => setEmail(e.target.value)}
          className={contactModalInput}
        />

        <input
          placeholder="Name (optional)"
          value={name || ``}
          onChange={(e) => setName(e.target.value)}
          className={contactModalInput}
        />

        <input
          placeholder="Street"
          value={address.street || ``}
          onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value }))}
          className={contactModalInput}
        />

        <input
          placeholder="City"
          value={address.city || ``}
          onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value }))}
          className={contactModalInput}
        />

        <input
          placeholder="State"
          value={address.state || ``}
          onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value }))}
          className={contactModalInput}
        />

        <input
          placeholder="PostalCode"
          value={address.postalCode || ``}
          onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value }))}
          className={contactModalInput}
        />

        <input
          placeholder="Country"
          value={address.country || ``}
          onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value }))}
          className={contactModalInput}
        />

        <div className={modalFooterActions}>
          <button onClick={onCloseAction} className={modalButtonSecondary}>
            Cancel
          </button>
          <button onClick={create} className={modalButtonPrimary}>
            Create
          </button>
        </div>
      </div>
    </div>
  );
}
