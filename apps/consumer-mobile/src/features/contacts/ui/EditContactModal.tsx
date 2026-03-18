'use client';

import { useState, useEffect } from 'react';

import { isValidEmail } from '@remoola/api-types';

import { getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { showErrorToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { FormInput } from '../../../shared/ui/FormInput';
import { ChevronDownIcon } from '../../../shared/ui/icons/ChevronDownIcon';
import { MapPinIcon } from '../../../shared/ui/icons/MapPinIcon';
import { Modal } from '../../../shared/ui/Modal';
import { type Contact, type ContactAddress } from '../schemas';
import styles from './EditContactModal.module.css';

interface EditContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  contact: Contact | null;
  onSubmit: (contactId: string, data: EditContactData) => Promise<void>;
}

export interface EditContactData {
  name?: string | null;
  email?: string;
  address?: ContactAddress | null;
}

export function EditContactModal({ isOpen, onClose, contact, onSubmit }: EditContactModalProps) {
  const [name, setName] = useState(``);
  const [email, setEmail] = useState(``);
  const [showAddress, setShowAddress] = useState(false);
  const [address, setAddress] = useState<ContactAddress>({
    street: null,
    city: null,
    state: null,
    postalCode: null,
    country: null,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && contact) {
      setName(contact.name ?? ``);
      setEmail(contact.email ?? ``);
      if (contact.address) {
        setAddress({
          street: contact.address.street ?? null,
          city: contact.address.city ?? null,
          state: contact.address.state ?? null,
          postalCode: contact.address.postalCode ?? null,
          country: contact.address.country ?? null,
        });
        setShowAddress(true);
      } else {
        setAddress({
          street: null,
          city: null,
          state: null,
          postalCode: null,
          country: null,
        });
        setShowAddress(false);
      }
    }
  }, [isOpen, contact]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!contact) return;

    const newErrors: Record<string, string> = {};

    if (email.trim() && !isValidEmail(email)) {
      newErrors.email = `Please enter a valid email`;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const hasAddress = address.street || address.city || address.state || address.postalCode || address.country;

      await onSubmit(contact.id, {
        name: name.trim() || null,
        email: email.trim() || undefined,
        address: hasAddress ? address : null,
      });

      onClose();
    } catch {
      showErrorToast(getLocalToastMessage(localToastKeys.CONTACT_UNEXPECTED_ERROR));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setErrors({});
    onClose();
  };

  if (!contact) return null;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Edit contact" size="lg">
      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField label="Email" htmlFor="edit-contact-email" error={errors.email}>
          <FormInput
            id="edit-contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            error={!!errors.email}
            className={styles.inputHeight}
          />
        </FormField>

        <FormField label="Name" htmlFor="edit-contact-name" error={errors.name}>
          <FormInput
            id="edit-contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe (optional)"
            error={!!errors.name}
            className={styles.inputHeight}
          />
        </FormField>

        <div className={styles.section}>
          <button type="button" onClick={() => setShowAddress(!showAddress)} className={styles.addressTrigger}>
            <div className={styles.addressTriggerLeft}>
              <MapPinIcon className={styles.addressTriggerIcon} />
              <span>Address (optional)</span>
            </div>
            <ChevronDownIcon className={`${styles.chevron} ${showAddress ? styles.chevronOpen : ``}`} />
          </button>

          {showAddress ? (
            <div className={styles.addressPanel}>
              <FormField label="Street" htmlFor="edit-contact-street">
                <FormInput
                  id="edit-contact-street"
                  value={address.street ?? ``}
                  onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value || null }))}
                  placeholder="123 Main Street"
                  className={styles.inputHeight}
                />
              </FormField>

              <div className={styles.grid2}>
                <FormField label="City" htmlFor="edit-contact-city">
                  <FormInput
                    id="edit-contact-city"
                    value={address.city ?? ``}
                    onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value || null }))}
                    placeholder="San Francisco"
                    className={styles.inputHeight}
                  />
                </FormField>

                <FormField label="State" htmlFor="edit-contact-state">
                  <FormInput
                    id="edit-contact-state"
                    value={address.state ?? ``}
                    onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value || null }))}
                    placeholder="CA"
                    className={styles.inputHeight}
                  />
                </FormField>
              </div>

              <div className={styles.grid2}>
                <FormField label="Postal Code" htmlFor="edit-contact-postal">
                  <FormInput
                    id="edit-contact-postal"
                    value={address.postalCode ?? ``}
                    onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value || null }))}
                    placeholder="94102"
                    className={styles.inputHeight}
                  />
                </FormField>

                <FormField label="Country" htmlFor="edit-contact-country">
                  <FormInput
                    id="edit-contact-country"
                    value={address.country ?? ``}
                    onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value || null }))}
                    placeholder="USA"
                    className={styles.inputHeight}
                  />
                </FormField>
              </div>
            </div>
          ) : null}
        </div>

        <div className={styles.actions}>
          <Button type="button" variant="outline" size="md" onClick={handleClose} className={styles.actionBtn}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="md" isLoading={isLoading} className={styles.submitBtn}>
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
