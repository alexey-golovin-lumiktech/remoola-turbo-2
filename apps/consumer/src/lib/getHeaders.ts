'use server';

import { cookies } from 'next/headers';

export async function getAuthHeaders() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join(`; `);

  return { cookie: cookieHeader };
}
