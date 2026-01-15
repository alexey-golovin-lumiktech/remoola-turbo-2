import type { AdminMe } from './types';

export async function getAdminMe(): Promise<AdminMe | null> {
  const response = await fetch(`/api/auth/me`, { cache: `no-store`, credentials: `include` as any });
  if (!response.ok) return null;
  return await response.json();
}

export function requireSuper(me: AdminMe | null) {
  if (!me) return { ok: false as const, reason: `unauthorized` as const };
  if (me.type !== `SUPER`) return { ok: false as const, reason: `forbidden` as const };
  return { ok: true as const };
}
