/**
 * Load-state helpers for protected pages (Phase C).
 * Use to separate unauthorized (401/403) from generic error in UI.
 */

import { isUnauthorizedError as isUnauthorizedErrorFromApiTypes } from '@remoola/api-types';

export type LoadState = `loading` | `ready` | `unauthorized` | `error`;

/** True when error is from auth failure; do not show Retry or generic error UI. */
export const isUnauthorizedError = isUnauthorizedErrorFromApiTypes;

/**
 * Derive admin protected-page state while keeping unresolved auth as neutral loading.
 * This prevents transient terminal unauthorized/error states during auth resolution windows.
 */
export function deriveAdminProtectedLoadState(params: {
  authResolved: boolean;
  hasData: boolean;
  error?: unknown;
}): LoadState {
  const { authResolved, hasData, error } = params;
  if (!authResolved) return `loading`;
  if (error) return isUnauthorizedError(error) ? `unauthorized` : `error`;
  return hasData ? `ready` : `loading`;
}
