/**
 * Client-side toast utilities for consumer-mobile
 *
 * Governance compliance:
 * - 06 §7.3 - Client shows user-safe messages, server logs real error
 * - Mobile-first UX with meaningful messages
 * - Uses sonner (already installed and configured in AppProviders)
 *
 * Usage:
 * ```typescript
 * import { showErrorToast, showSuccessToast } from '@/lib/toast.client';
 *
 * // In a client component after server action:
 * const result = await transferFundsAction(data);
 * if (!result.ok) {
 *   showErrorToast(result.error.message);
 * } else {
 *   showSuccessToast('Transfer completed successfully');
 * }
 * ```
 */

import { toast } from 'sonner';

import { getErrorMessageForUser, getLocalToastMessage, localToastKeys } from './error-messages';
import { clientLogger } from './logger';

interface ToastErrorOptions {
  code?: string;
  correlationId?: string;
  duration?: number;
}

/**
 * Show an error toast with user-friendly messaging
 * Automatically maps error codes to friendly messages
 * Logs technical details for debugging
 */
export function showErrorToast(message: string, options?: ToastErrorOptions): string | number {
  const { code, correlationId, duration = 6000 } = options ?? {};

  const friendlyMessage = code ? getErrorMessageForUser(code, message) : message;

  // Log only code/correlationId/displayedMessage — never raw `message` (may contain server-supplied PII)
  clientLogger.error(`Toast error displayed`, {
    code,
    correlationId,
    displayedMessage: friendlyMessage,
  });

  return toast.error(friendlyMessage, {
    duration,
    description: correlationId ? `Reference: ${correlationId.slice(-8)}` : undefined,
  });
}

/**
 * Show a success toast
 */
export function showSuccessToast(
  message: string,
  options?: { duration?: number; description?: string },
): string | number {
  const { duration = 4000, description } = options ?? {};

  return toast.success(message, {
    duration,
    description,
  });
}

/**
 * Show an info toast
 */
export function showInfoToast(message: string, options?: { duration?: number; description?: string }): string | number {
  const { duration = 4000, description } = options ?? {};

  return toast.info(message, {
    duration,
    description,
  });
}

/**
 * Show a warning toast
 */
export function showWarningToast(
  message: string,
  options?: { duration?: number; description?: string },
): string | number {
  const { duration = 4000, description } = options ?? {};

  return toast.warning(message, {
    duration,
    description,
  });
}

/**
 * Show a loading toast (returns ID for dismissing later)
 */
export function showLoadingToast(message: string): string | number {
  return toast.loading(message);
}

/**
 * Dismiss a specific toast by ID
 */
export function dismissToast(toastId: string | number): void {
  toast.dismiss(toastId);
}

/**
 * Dismiss all toasts
 */
export function dismissAllToasts(): void {
  toast.dismiss();
}

/**
 * Handle server action result with automatic toast
 * Returns true if successful, false if error
 *
 * Usage:
 * ```typescript
 * const success = await handleActionResult(
 *   transferFundsAction(data),
 *   'Transfer completed successfully',
 * );
 * if (success) {
 *   router.push('/payments');
 * }
 * ```
 */
export async function handleActionResult<T>(
  actionPromise: Promise<{ ok: true; data?: T } | { ok: false; error: { code: string; message: string } }>,
  successMessage: string,
): Promise<boolean> {
  const result = await actionPromise;

  if (!result.ok) {
    showErrorToast(getErrorMessageForUser(result.error.code, getLocalToastMessage(localToastKeys.UNEXPECTED_ERROR)), {
      code: result.error.code,
    });
    return false;
  }

  showSuccessToast(successMessage);
  return true;
}
