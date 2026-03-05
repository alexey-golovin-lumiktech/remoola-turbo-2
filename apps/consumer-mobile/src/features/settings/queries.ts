import { profileSchema, settingsSchema, type Profile, type Settings } from './schemas';
import { getEnv } from '../../lib/env.server';

export async function getProfile(cookie: string | null): Promise<Profile | null> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return null;
  const res = await fetch(`${baseUrl}/consumer/profile/me`, {
    method: `GET`,
    headers: { Cookie: cookie ?? `` },
    cache: `no-store`,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const raw = await res.json();
  const parsed = profileSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export async function getSettings(cookie: string | null): Promise<Settings | null> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return null;
  const res = await fetch(`${baseUrl}/consumer/settings`, {
    method: `GET`,
    headers: { Cookie: cookie ?? `` },
    cache: `no-store`,
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const raw = await res.json();
  const parsed = settingsSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
