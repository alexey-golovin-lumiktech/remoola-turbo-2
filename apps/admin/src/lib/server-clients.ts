import 'server-only';
import { cookies } from 'next/headers';

type BackendResponse<T> = {
  requestId: string;
  timestamp: string;
  path: string;
  data: T;
  version: string;
};
export async function getClientSSR<T>(clientId: string) {
  const token = (await cookies()).get(`access_token`)?.value;
  const base = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const url = new URL(`${base}/admin/clients/${clientId}`);
  const res = await fetch(url, {
    headers: {
      Authorization: token ? `Bearer ${token}` : ``,
    },
    cache: `no-store`,
  });

  if (!res.ok) return null;
  const json: BackendResponse<T> = await res.json();
  return json.data;
}
