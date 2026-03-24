'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { emailSchema } from '@remoola/api-types';
import { cn } from '@remoola/ui';

import localStyles from './EditContactModal.module.css';
import { type ConsumerContactAddress, type ConsumerContact } from '../../../types';
import styles from '../../ui/classNames.module.css';

const {
  contactModalInput,
  modalButtonPrimary,
  modalButtonSecondary,
  modalFooterActions,
  modalOverlayClass,
  modalTitleClass,
} = styles;

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
    const emailParsed = emailSchema.safeParse(email.trim());
    if (!emailParsed.success) {
      toast.error(emailParsed.error.issues[0]?.message ?? `Enter a valid email address`);
      return;
    }
    const res = await fetch(`/api/contacts/${contact!.id}`, {
      method: `PATCH`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({ name, email: emailParsed.data, address }),
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
    <div className={cn(modalOverlayClass, localStyles.modalOverlay)}>
      <div className={localStyles.modalBody}>
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
