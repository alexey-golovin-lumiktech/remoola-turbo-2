import 'server-only';

import { fetchConsumerApi } from '../consumer-api-fetch.server';
import {
  type ContactDetailsResponse,
  type ContactResponse,
  type ContactsResponse,
  type ContactSearchItem,
} from '../consumer-api.types';
import { normalizeDocumentDownloadUrl } from '../document-download-url';

export async function getContacts(page = 1, pageSize = 20): Promise<ContactsResponse | null> {
  return fetchConsumerApi<ContactsResponse>(`/consumer/contacts?page=${page}&pageSize=${pageSize}`);
}

export async function searchContacts(query: string, limit = 20): Promise<ContactSearchItem[] | null> {
  const trimmedQuery = query.trim();
  if (!trimmedQuery) return [];
  const safeLimit = Math.min(20, Math.max(1, Math.floor(limit) || 20));
  return fetchConsumerApi<ContactSearchItem[]>(
    `/consumer/contacts?query=${encodeURIComponent(trimmedQuery)}&limit=${safeLimit}`,
  );
}

export async function findContactByExactEmail(email: string): Promise<ContactSearchItem | null> {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return null;
  return fetchConsumerApi<ContactSearchItem | null>(
    `/consumer/contacts/lookup/by-email?email=${encodeURIComponent(normalizedEmail)}`,
  );
}

export async function getContact(contactId: string): Promise<ContactResponse | null> {
  const id = contactId.trim();
  if (!id) return null;
  return fetchConsumerApi<ContactResponse>(`/consumer/contacts/${id}`);
}

export async function getContactDetails(contactId: string): Promise<ContactDetailsResponse | null> {
  const id = contactId.trim();
  if (!id) return null;
  const contact = await fetchConsumerApi<ContactDetailsResponse>(`/consumer/contacts/${id}/details`);
  if (!contact) return null;

  return {
    ...contact,
    documents: contact.documents.map((document) => ({
      ...document,
      url: normalizeDocumentDownloadUrl(document.url, document.id),
    })),
  };
}
