'use client';

import { useState, useEffect } from 'react';

import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { FormInput } from '../../../shared/ui/FormInput';
import { Modal } from '../../../shared/ui/Modal';

import type { Contact, ContactAddress } from '../schemas';

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

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
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
      setErrors({ submit: `Failed to update contact. Please try again.` });
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
      <form onSubmit={handleSubmit} className={`space-y-5`}>
        <FormField label="Email" htmlFor="edit-contact-email" error={errors.email}>
          <FormInput
            id="edit-contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            error={!!errors.email}
            className={`min-h-[44px]`}
          />
        </FormField>

        <FormField label="Name" htmlFor="edit-contact-name" error={errors.name}>
          <FormInput
            id="edit-contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe (optional)"
            error={!!errors.name}
            className={`min-h-[44px]`}
          />
        </FormField>

        <div
          className={`
          border-t
          border-slate-200
          pt-5
          dark:border-slate-700
        `}
        >
          <button
            type="button"
            onClick={() => setShowAddress(!showAddress)}
            className={`
              flex
              w-full
              items-center
              justify-between
              rounded-xl
              p-3
              text-sm
              font-semibold
              text-slate-700
              transition-all
              hover:bg-slate-100
              dark:text-slate-300
              dark:hover:bg-slate-800
              active:scale-98
            `}
          >
            <div className={`flex items-center gap-2`}>
              <svg
                className={`h-5 w-5 text-slate-500`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
                />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span>Address (optional)</span>
            </div>
            <svg
              className={`h-5 w-5 transition-transform duration-200 ${showAddress ? `rotate-180` : ``}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {showAddress && (
            <div className={`mt-4 space-y-4 animate-slideDown`}>
              <FormField label="Street" htmlFor="edit-contact-street">
                <FormInput
                  id="edit-contact-street"
                  value={address.street ?? ``}
                  onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value || null }))}
                  placeholder="123 Main Street"
                  className={`min-h-[44px]`}
                />
              </FormField>

              <div className={`grid gap-4 sm:grid-cols-2`}>
                <FormField label="City" htmlFor="edit-contact-city">
                  <FormInput
                    id="edit-contact-city"
                    value={address.city ?? ``}
                    onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value || null }))}
                    placeholder="San Francisco"
                    className={`min-h-[44px]`}
                  />
                </FormField>

                <FormField label="State" htmlFor="edit-contact-state">
                  <FormInput
                    id="edit-contact-state"
                    value={address.state ?? ``}
                    onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value || null }))}
                    placeholder="CA"
                    className={`min-h-[44px]`}
                  />
                </FormField>
              </div>

              <div className={`grid gap-4 sm:grid-cols-2`}>
                <FormField label="Postal Code" htmlFor="edit-contact-postal">
                  <FormInput
                    id="edit-contact-postal"
                    value={address.postalCode ?? ``}
                    onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value || null }))}
                    placeholder="94102"
                    className={`min-h-[44px]`}
                  />
                </FormField>

                <FormField label="Country" htmlFor="edit-contact-country">
                  <FormInput
                    id="edit-contact-country"
                    value={address.country ?? ``}
                    onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value || null }))}
                    placeholder="USA"
                    className={`min-h-[44px]`}
                  />
                </FormField>
              </div>
            </div>
          )}
        </div>

        {errors.submit && (
          <div
            className={`
            rounded-xl
            border
            border-red-200
            bg-red-50
            p-4
            dark:border-red-800
            dark:bg-red-900/20
            animate-fadeIn
          `}
          >
            <div className={`flex items-start gap-3`}>
              <svg
                className={`
                  h-5
                  w-5
                  text-red-600
                  dark:text-red-400
                  shrink-0
                  mt-0.5
                `}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p
                className={`
                text-sm
                font-medium
                text-red-800
                dark:text-red-300
              `}
              >
                {errors.submit}
              </p>
            </div>
          </div>
        )}

        <div
          className={`
          flex
          flex-col
          gap-3
          pt-3
          sm:flex-row
        `}
        >
          <Button type="button" variant="outline" size="md" onClick={handleClose} className={`min-h-[44px] flex-1`}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            className={`
              min-h-[44px]
              flex-1
              shadow-lg
              shadow-primary-500/30
              hover:shadow-xl
              hover:shadow-primary-500/40
            `}
          >
            Save changes
          </Button>
        </div>
      </form>
    </Modal>
  );
}
