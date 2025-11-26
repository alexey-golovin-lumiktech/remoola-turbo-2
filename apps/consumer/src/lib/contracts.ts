import { type ConsumerContractItem } from '../types';
import { getAuthHeaders } from './getHeaders';

export async function getContracts(): Promise<ConsumerContractItem[]> {
  const headers = await getAuthHeaders();

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const res = await fetch(`${baseUrl}/contracts`, {
    headers: headers,
    credentials: `include`,
    cache: `no-cache`,
  });

  if (!res.ok) {
    throw new Error(`Failed to load contracts`);
  }

  return res.json();
}
