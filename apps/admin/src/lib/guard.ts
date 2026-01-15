import type { AdminMe } from './types';

export async function getAdminMe(): Promise<AdminMe | null> {
  const res = await fetch(`/api/auth/me`, { cache: `no-store`, credentials: `include` as any });
  if (!res.ok) return null;
  return (await res.json()) as AdminMe;
}

export function requireSuper(me: AdminMe | null) {
  if (!me) return { ok: false as const, reason: `unauthorized` as const };
  if (me.type !== `SUPER`) return { ok: false as const, reason: `forbidden` as const };
  return { ok: true as const };
}
