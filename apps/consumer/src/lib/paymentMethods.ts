import { headers } from 'next/headers';

import { getAuthHeaders } from './getHeaders';
export async function getPaymentMethods() {
  const host = (await headers()).get(`host`);
  const protocol = process.env.NODE_ENV === `development` ? `http` : `https`;
  const url = `${protocol}://${host}/api/payment-methods`;
  const authHeaders = await getAuthHeaders();

  const res = await fetch(url, {
    headers: authHeaders,
    credentials: `include`,
  });

  if (!res.ok) {
    throw new Error(`Failed to load payment methods: ${res.status}`);
  }

  return res.json();
}
