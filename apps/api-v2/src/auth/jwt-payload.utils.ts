import { type IJwtTokenPayload } from '../dtos/consumer';

export function resolveIdentityId(payload: IJwtTokenPayload): string | null {
  return payload.identityId ?? payload.sub ?? null;
}

export function isRefreshPayload(payload: IJwtTokenPayload): boolean {
  return payload.typ === `refresh` || (payload as { type?: string }).type === `refresh`;
}
