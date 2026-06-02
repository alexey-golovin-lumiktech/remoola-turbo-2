'use client';

import { useEffect, useState } from 'react';

export type Contact = {
  id: string;
  email?: string | null;
  name?: string | null;
  address?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
    postalCode?: string | null;
    country?: string | null;
  } | null;
};

type EditableContactForm = {
  email: string;
  name: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
};

type ContactMessage = { type: `error` | `success`; text: string } | null;

type UseContactFormStateInput = {
  createMode: boolean;
  initialEmail: string;
  initialEditingContact: Contact | null;
};

export function createInitialContactForm(createMode: boolean, initialEmail: string): EditableContactForm {
  return {
    email: createMode ? initialEmail : ``,
    name: ``,
    street: ``,
    city: ``,
    state: ``,
    postalCode: ``,
    country: ``,
  };
}

export function toEditableContactForm(contact: Contact): EditableContactForm {
  return {
    email: contact.email ?? ``,
    name: contact.name ?? ``,
    street: contact.address?.street ?? ``,
    city: contact.address?.city ?? ``,
    state: contact.address?.state ?? ``,
    postalCode: contact.address?.postalCode ?? ``,
    country: contact.address?.country ?? ``,
  };
}

export function displayContactAddress(contact: Contact) {
  const parts = [
    contact.address?.street,
    contact.address?.city,
    contact.address?.state,
    contact.address?.postalCode,
    contact.address?.country,
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(`, `) : `No address details`;
}

export function useContactFormState({ createMode, initialEmail, initialEditingContact }: UseContactFormStateInput) {
  const [form, setForm] = useState<EditableContactForm>(createInitialContactForm(createMode, initialEmail));
  const [message, setMessage] = useState<ContactMessage>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [editingContactId, setEditingContactId] = useState<string | null>(null);

  useEffect(() => {
    if (!initialEditingContact) return;
    setEditingContactId(initialEditingContact.id);
    setForm(toEditableContactForm(initialEditingContact));
    setMessage(null);
  }, [initialEditingContact]);

  const resetForm = () => {
    setForm(createInitialContactForm(createMode, initialEmail));
  };

  const startEditing = (contact: Contact) => {
    setEditingContactId(contact.id);
    setForm(toEditableContactForm(contact));
    setMessage(null);
  };

  const cancelEditing = () => {
    setEditingContactId(null);
    resetForm();
    setMessage(null);
  };

  return {
    cancelEditing,
    editingContactId,
    form,
    message,
    pendingDeleteId,
    resetForm,
    setEditingContactId,
    setForm,
    setMessage,
    setPendingDeleteId,
    startEditing,
  };
}

export type ContactFormStateResult = ReturnType<typeof useContactFormState>;
