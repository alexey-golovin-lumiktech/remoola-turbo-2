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
  const api = process.env.NEXT_PUBLIC_API_BASE_URL!;

  const cookieStore = await nextCookies(); // ✅ await the async cookies() call
  const cookieHeader = cookieStore.toString(); // ← include session cookies
  const res = await fetch(`${api}/auth/me`, {
    headers: { cookie: cookieHeader, 'content-type': `application/json` },
    credentials: `include`,
    cache: `no-store`,
  });

  console.log(`apps/admin/src/lib/server-auth.ts /me res.ok`, res.ok);
  if (!res.ok) return null;
  const json: BackendResponse<T> = await res.json();
  return json.data;
}
