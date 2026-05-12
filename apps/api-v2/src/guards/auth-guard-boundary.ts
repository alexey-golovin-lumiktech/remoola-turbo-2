import { isAdminApiPath } from '@remoola/api-types';

import { getApiAdminAccessTokenCookieKeysForRead, getApiConsumerAccessTokenCookieKeysForRead } from '../shared-common';

export const CONSUMER_API_PATH_PREFIX = `/api/consumer/`;

export const GuardMessage = {
  INVALID_TOKEN: `Invalid or expired token`,
  NO_IDENTITY_RECORD: `Authentication record not found`,
  ONLY_FOR_ADMINS: `Access restricted to administrators`,
  ONLY_FOR_CONSUMERS: `Access restricted to consumers`,
} as const;

export function getRequestPath(request: { path?: string; url?: string }) {
  return request.path ?? request.url?.split(`?`)[0] ?? ``;
}

export function getAccessTokenCookieKeysForPath(
  path: string,
  consumerScope?: Parameters<typeof getApiConsumerAccessTokenCookieKeysForRead>[0],
): readonly string[] {
  if (path.startsWith(CONSUMER_API_PATH_PREFIX)) {
    if (!consumerScope) {
      return [];
    }
    return getApiConsumerAccessTokenCookieKeysForRead(consumerScope);
  }
  if (isAdminApiPath(path)) {
    return getApiAdminAccessTokenCookieKeysForRead();
  }
  return getApiConsumerAccessTokenCookieKeysForRead(consumerScope);
}
