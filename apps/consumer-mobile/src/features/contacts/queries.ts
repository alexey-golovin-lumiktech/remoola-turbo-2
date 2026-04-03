import { contactListSchema, contactSchema, contactDetailsSchema, type Contact, type ContactDetails } from './schemas';
import { getEnv } from '../../lib/env.server';
import { buildServerReadAuthHeaders } from '../../lib/server-action-auth';

export async function getContactsList(cookie: string | null): Promise<Contact[]> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return [];
  const res = await fetch(`${baseUrl}/consumer/contacts`, {
    method: `GET`,
    headers: buildServerReadAuthHeaders(cookie),
    cache: `no-store`,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return [];
  const raw = await res.json();
  const parsed = contactListSchema.safeParse(Array.isArray(raw) ? raw : (raw?.data ?? raw?.items ?? []));
  return parsed.success ? parsed.data : [];
}

export async function getContactDetail(contactId: string, cookie: string | null): Promise<Contact | null> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return null;
  const res = await fetch(`${baseUrl}/consumer/contacts/${contactId}`, {
    method: `GET`,
    headers: buildServerReadAuthHeaders(cookie),
    cache: `no-store`,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const raw = await res.json();
  const parsed = contactSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function getContactDetailsFull(contactId: string, cookie: string | null): Promise<ContactDetails | null> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return null;
  const res = await fetch(`${baseUrl}/consumer/contacts/${contactId}/details`, {
    method: `GET`,
    headers: buildServerReadAuthHeaders(cookie),
    cache: `no-store`,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const raw = await res.json();
  const parsed = contactDetailsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
