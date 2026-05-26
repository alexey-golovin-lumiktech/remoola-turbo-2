import { type IJwtTokenPayload } from './jwt-payload.types';

export function resolveIdentityId(payload: IJwtTokenPayload): string | null {
  return payload.identityId ?? payload.sub ?? null;
}

export function isRefreshPayload(payload: IJwtTokenPayload): boolean {
  return payload.typ === `refresh` || (payload as { type?: string }).type === `refresh`;
}
