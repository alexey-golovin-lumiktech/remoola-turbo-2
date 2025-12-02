'use server';

import { cookies } from 'next/headers';

export async function getAuthHeaders(authorization: string | null) {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join(`; `);

  return {
    cookie: cookieHeader,
    authorization:
      authorization || `Basic YWxleGV5LmdvbG92aW5AbHVtaWt0ZWNoLmNvbTphbGV4ZXkuZ29sb3ZpbkBsdW1pa3RlY2guY29t`,
  };
}
