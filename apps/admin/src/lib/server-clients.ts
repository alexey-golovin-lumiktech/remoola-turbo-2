import 'server-only';
import { cookies as nextCookies } from 'next/headers';

type BackendResponse<T> = {
  requestId: string;
  timestamp: string;
  path: string;
  data: T;
  version: string;
};
export async function getClientSSR<T>(clientId: string) {
  const cookieStore = await nextCookies(); // ✅ await the async cookies() call
  const cookieHeader = cookieStore.toString(); // ← include session cookies
  const accessToken = cookieStore.get(`access_token`)?.value;
  const tokenPublic = cookieStore.get(`access_token_public`)?.value;
  const token = accessToken || tokenPublic;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const url = new URL(`${base}/admin/clients/${clientId}`);
  const res = await fetch(url, {
    headers: { Cookie: cookieHeader, Authorization: token ? `Bearer ${token}` : `` },
    cache: `no-store`,
  });

  if (!res.ok) return null;
  const json: BackendResponse<T> = await res.json();
  return json.data;
}
