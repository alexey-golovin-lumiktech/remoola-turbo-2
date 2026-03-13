'use client';

import { useEffect, useState } from 'react';

import { getLocalToastMessage, localToastKeys } from '../../../lib/error-messages';
import { showErrorToast } from '../../../lib/toast.client';
import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { FormInput } from '../../../shared/ui/FormInput';
import { ChevronDownIcon } from '../../../shared/ui/icons/ChevronDownIcon';
import { MapPinIcon } from '../../../shared/ui/icons/MapPinIcon';
import { Modal } from '../../../shared/ui/Modal';
import { type ContactAddress } from '../schemas';
import styles from './CreateContactModal.module.css';

interface CreateContactModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: CreateContactData) => Promise<void>;
  initialEmail?: string | null;
}

export interface CreateContactData {
  name: string | null;
  email: string;
  address?: ContactAddress | null;
}

export function CreateContactModal({ isOpen, onClose, onSubmit, initialEmail }: CreateContactModalProps) {
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
    if (isOpen && initialEmail) {
      setEmail(initialEmail);
    }
  }, [isOpen, initialEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const newErrors: Record<string, string> = {};

    if (!email.trim()) {
      newErrors.email = `Email is required`;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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

      await onSubmit({
        name: name.trim() || null,
        email: email.trim(),
        address: hasAddress ? address : null,
      });

      setName(``);
      setEmail(``);
      setShowAddress(false);
      setAddress({
        street: null,
        city: null,
        state: null,
        postalCode: null,
        country: null,
      });
      onClose();
    } catch {
      showErrorToast(getLocalToastMessage(localToastKeys.CONTACT_UNEXPECTED_ERROR));
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setName(``);
    setEmail(``);
    setShowAddress(false);
    setAddress({
      street: null,
      city: null,
      state: null,
      postalCode: null,
      country: null,
    });
    setErrors({});
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Add new contact" size="lg">
      <form onSubmit={handleSubmit} className={styles.form}>
        <FormField label="Email" htmlFor="contact-email" error={errors.email} required>
          <FormInput
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            error={!!errors.email}
            autoFocus
            className={styles.inputHeight}
          />
        </FormField>

        <FormField label="Name" htmlFor="contact-name" error={errors.name}>
          <FormInput
            id="contact-name"
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
              <FormField label="Street" htmlFor="contact-street">
                <FormInput
                  id="contact-street"
                  value={address.street ?? ``}
                  onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value || null }))}
                  placeholder="123 Main Street"
                  className={styles.inputHeight}
                />
              </FormField>

              <div className={styles.grid2}>
                <FormField label="City" htmlFor="contact-city">
                  <FormInput
                    id="contact-city"
                    value={address.city ?? ``}
                    onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value || null }))}
                    placeholder="San Francisco"
                    className={styles.inputHeight}
                  />
                </FormField>

                <FormField label="State" htmlFor="contact-state">
                  <FormInput
                    id="contact-state"
                    value={address.state ?? ``}
                    onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value || null }))}
                    placeholder="CA"
                    className={styles.inputHeight}
                  />
                </FormField>
              </div>

              <div className={styles.grid2}>
                <FormField label="Postal Code" htmlFor="contact-postal">
                  <FormInput
                    id="contact-postal"
                    value={address.postalCode ?? ``}
                    onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value || null }))}
                    placeholder="94102"
                    className={styles.inputHeight}
                  />
                </FormField>

                <FormField label="Country" htmlFor="contact-country">
                  <FormInput
                    id="contact-country"
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
            Add contact
          </Button>
        </div>
      </form>
    </Modal>
  );
}
