'use client';

import { useEffect, useState } from 'react';

import { Button } from '../../../shared/ui/Button';
import { FormField } from '../../../shared/ui/FormField';
import { FormInput } from '../../../shared/ui/FormInput';
import { ChevronDownIcon } from '../../../shared/ui/icons/ChevronDownIcon';
import { MapPinIcon } from '../../../shared/ui/icons/MapPinIcon';
import { XCircleIcon } from '../../../shared/ui/icons/XCircleIcon';
import { Modal } from '../../../shared/ui/Modal';

import type { ContactAddress } from '../schemas';

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
      setErrors({ submit: `Failed to create contact. Please try again.` });
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
      <form onSubmit={handleSubmit} className={`space-y-5`}>
        <FormField label="Email" htmlFor="contact-email" error={errors.email} required>
          <FormInput
            id="contact-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="john@example.com"
            error={!!errors.email}
            autoFocus
            className={`min-h-11`}
          />
        </FormField>

        <FormField label="Name" htmlFor="contact-name" error={errors.name}>
          <FormInput
            id="contact-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="John Doe (optional)"
            error={!!errors.name}
            className={`min-h-11`}
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
              <MapPinIcon className={`h-5 w-5 text-slate-500`} />
              <span>Address (optional)</span>
            </div>
            <ChevronDownIcon
              className={`h-5 w-5 transition-transform duration-200 ${showAddress ? `rotate-180` : ``}`}
            />
          </button>

          {showAddress && (
            <div className={`mt-4 space-y-4 animate-slideDown`}>
              <FormField label="Street" htmlFor="contact-street">
                <FormInput
                  id="contact-street"
                  value={address.street ?? ``}
                  onChange={(e) => setAddress((a) => ({ ...a, street: e.target.value || null }))}
                  placeholder="123 Main Street"
                  className={`min-h-11`}
                />
              </FormField>

              <div className={`grid gap-4 sm:grid-cols-2`}>
                <FormField label="City" htmlFor="contact-city">
                  <FormInput
                    id="contact-city"
                    value={address.city ?? ``}
                    onChange={(e) => setAddress((a) => ({ ...a, city: e.target.value || null }))}
                    placeholder="San Francisco"
                    className={`min-h-11`}
                  />
                </FormField>

                <FormField label="State" htmlFor="contact-state">
                  <FormInput
                    id="contact-state"
                    value={address.state ?? ``}
                    onChange={(e) => setAddress((a) => ({ ...a, state: e.target.value || null }))}
                    placeholder="CA"
                    className={`min-h-11`}
                  />
                </FormField>
              </div>

              <div className={`grid gap-4 sm:grid-cols-2`}>
                <FormField label="Postal Code" htmlFor="contact-postal">
                  <FormInput
                    id="contact-postal"
                    value={address.postalCode ?? ``}
                    onChange={(e) => setAddress((a) => ({ ...a, postalCode: e.target.value || null }))}
                    placeholder="94102"
                    className={`min-h-11`}
                  />
                </FormField>

                <FormField label="Country" htmlFor="contact-country">
                  <FormInput
                    id="contact-country"
                    value={address.country ?? ``}
                    onChange={(e) => setAddress((a) => ({ ...a, country: e.target.value || null }))}
                    placeholder="USA"
                    className={`min-h-11`}
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
              <XCircleIcon
                className={`
  h-5
  w-5
  text-red-600
  dark:text-red-400
  shrink-0
  mt-0.5
                `}
              />
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
          <Button type="button" variant="outline" size="md" onClick={handleClose} className={`min-h-11 flex-1`}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isLoading}
            className={`
  min-h-11
  flex-1
  shadow-lg
  shadow-primary-500/30
  hover:shadow-xl
  hover:shadow-primary-500/40
            `}
          >
            Add contact
          </Button>
        </div>
      </form>
    </Modal>
  );
}
