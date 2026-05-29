'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';

import { type Contact, useContactFormState } from './contact-form-state';
import { useContactsPageState } from './contacts-page-state';
import { ContactsSections } from './contacts-sections';
import {
  createContactMutation,
  deleteContactMutation,
  updateContactMutation,
} from '../../../lib/mutations/contacts.server';
import { handleSessionExpiredError } from '../../../lib/session-expired';

type Props = {
  contacts: Contact[];
  createMode?: boolean;
  initialEmail?: string;
  initialEditingContact?: Contact | null;
  returnTo?: string;
  initialQuery?: string;
  searchMode?: boolean;
  totalContacts?: number;
  page?: number;
  pageSize?: number;
};

export function ContactsClient({
  contacts,
  createMode = false,
  initialEmail = ``,
  initialEditingContact = null,
  returnTo = ``,
  initialQuery = ``,
  searchMode = false,
  totalContacts = contacts.length,
  page = 1,
  pageSize = 20,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const formState = useContactFormState({
    createMode,
    initialEmail,
    initialEditingContact,
  });
  const pageState = useContactsPageState({
    contacts,
    returnTo,
    initialQuery,
    searchMode,
    totalContacts,
    page,
    pageSize,
  });

  const handleFormSubmit = () => {
    formState.setMessage(null);
    startTransition(async () => {
      const editingId = formState.editingContactId;
      const isEditing = Boolean(editingId);
      const result = editingId
        ? await updateContactMutation(editingId, formState.form)
        : await createContactMutation(formState.form);
      if (!result.ok) {
        if (handleSessionExpiredError(result.error)) return;
        formState.setMessage({ type: `error`, text: result.error.message });
        return;
      }
      formState.resetForm();
      formState.setEditingContactId(null);
      if (pageState.safeReturnTo && (createMode || isEditing)) {
        router.push(pageState.safeReturnTo);
        return;
      }
      formState.setMessage({
        type: `success`,
        text: result.message ?? (isEditing ? `Contact updated` : `Contact created`),
      });
      router.refresh();
    });
  };

  const handleDelete = (contact: Contact) => {
    formState.setMessage(null);
    formState.setPendingDeleteId(contact.id);
    startTransition(async () => {
      const result = await deleteContactMutation(contact.id);
      formState.setPendingDeleteId(null);
      if (!result.ok) {
        if (handleSessionExpiredError(result.error)) return;
        formState.setMessage({ type: `error`, text: result.error.message });
        return;
      }
      if (formState.editingContactId === contact.id) {
        formState.setEditingContactId(null);
        formState.resetForm();
      }
      formState.setMessage({ type: `success`, text: result.message ?? `Contact deleted` });
      router.refresh();
    });
  };

  return (
    <ContactsSections
      contacts={contacts}
      createMode={createMode}
      formState={formState}
      isPending={isPending}
      onDelete={handleDelete}
      onFormSubmit={handleFormSubmit}
      pageState={pageState}
    />
  );
}
