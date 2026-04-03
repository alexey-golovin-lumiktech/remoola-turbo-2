import { profileSchema, settingsSchema, type Profile, type Settings } from './schemas';
import { getEnv } from '../../lib/env.server';
import { buildServerReadAuthHeaders } from '../../lib/server-action-auth';

export type ProfileResult = { kind: `ok`; data: Profile } | { kind: `unauthorized` } | { kind: `error` };

export type SettingsResult = { kind: `ok`; data: Settings } | { kind: `unauthorized` } | { kind: `error` };

export type LoadState = `loading` | `ready` | `unauthorized` | `error`;

export async function getProfile(cookie: string | null): Promise<ProfileResult> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return { kind: `error` };
  try {
    const res = await fetch(`${baseUrl}/consumer/profile/me`, {
      method: `GET`,
      headers: buildServerReadAuthHeaders(cookie),
      cache: `no-store`,
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 401 || res.status === 403) return { kind: `unauthorized` };
    if (!res.ok) return { kind: `error` };
    const raw = await res.json();
    const parsed = profileSchema.safeParse(raw);
    return parsed.success ? { kind: `ok`, data: parsed.data } : { kind: `error` };
  } catch {
    return { kind: `error` };
  }
}

export async function getSettings(cookie: string | null): Promise<SettingsResult> {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
  if (!baseUrl) return { kind: `error` };
  try {
    const res = await fetch(`${baseUrl}/consumer/settings`, {
      method: `GET`,
      headers: buildServerReadAuthHeaders(cookie),
      cache: `no-store`,
      signal: AbortSignal.timeout(10000),
    });
    if (res.status === 401 || res.status === 403) return { kind: `unauthorized` };
    if (!res.ok) return { kind: `error` };
    const raw = await res.json();
    const parsed = settingsSchema.safeParse(raw);
    return parsed.success ? { kind: `ok`, data: parsed.data } : { kind: `error` };
  } catch {
    return { kind: `error` };
  }
}

/** Derive single load state from profile + settings results. */
export function deriveLoadState(profileResult: ProfileResult, settingsResult: SettingsResult): LoadState {
  if (profileResult.kind === `unauthorized` || settingsResult.kind === `unauthorized`) return `unauthorized`;
  if (profileResult.kind === `error` || settingsResult.kind === `error`) return `error`;
  return `ready`;
}

/** Terminal states should render only once load/auth truth is resolved. */
export function isTerminalSettingsState(state: LoadState): boolean {
  return state === `unauthorized` || state === `error`;
}
