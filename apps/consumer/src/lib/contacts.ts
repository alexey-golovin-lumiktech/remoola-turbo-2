import { type ConsumerContactDetails, type ConsumerContact } from '../types';
import { getAuthHeaders } from './getHeaders';

export async function getContacts(): Promise<{ items: ConsumerContact[] }> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/contacts`, {
    headers: headers,
    credentials: `include`,
    cache: `no-cache`,
  });
  console.log(`res`, res);
  if (!res.ok) throw new Error(`Failed to load contacts`);
  return res.json();
}

export async function getContactDetails(id: string): Promise<ConsumerContactDetails> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/contacts/${id}/details`, {
    headers: headers,
    credentials: `include`,
  });
  if (!res.ok) throw new Error(`Failed to load contact`);
  return res.json();
}
