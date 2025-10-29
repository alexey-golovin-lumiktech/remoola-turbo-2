import { cookies as nextCookies } from 'next/headers';
type R = { id: string; email: string; role: `client` | `admin` | `superadmin` };
type BackendResponse<T> = {
  requestId: string;
  timestamp: string;
  path: string;
  data: T;
  version: string;
};

export async function getMeSSR<T = R>() {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL!;

  const cookieStore = await nextCookies();
  const cookieHeader = cookieStore
    .getAll()
    .map(({ name, value }) => `${name}=${encodeURIComponent(value)}`)
    .join(`; `);

  const res = await fetch(`${base}/auth/me`, {
    headers: { cookie: cookieHeader },
    cache: `no-store`,
  });

  if (!res.ok) return null;
  const json: BackendResponse<T> = await res.json();
  return json.data;
}
