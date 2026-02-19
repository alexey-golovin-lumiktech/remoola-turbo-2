/* eslint-disable max-len */
/**
 * Admin app: local toast message keys and API error code mapping.
 * Use getLocalToastMessage(key, fallback?) for client-side toasts; getErrorMessageForUser(codeOrMessage, fallback) for API errors.
 */

import { adminErrorCodes, errorCodes } from '@remoola/shared-constants';

// ---------------------------------------------------------------------------
// API error code (CONSTANT_CASE from shared-constants) → admin-facing message
// ---------------------------------------------------------------------------

const API_ERROR_MAP: Record<string, string> = {
  // Admin auth — login, refresh
  [adminErrorCodes.ADMIN_INVALID_CREDENTIALS]: `Wrong email or password. Check and try again.`,
  [adminErrorCodes.ADMIN_NO_IDENTITY_RECORD]: `Session not found. Sign in again.`,
  [adminErrorCodes.ADMIN_REFRESH_TOKEN_INVALID]: `Session expired. Sign in again.`,

  // Admin payment-requests — reversal
  [adminErrorCodes.ADMIN_PAYMENT_REQUEST_NOT_FOUND]: `This payment request was not found.`,
  [adminErrorCodes.ADMIN_ONLY_COMPLETED_CAN_BE_REVERSED]: `Only completed payment requests can be reversed.`,
  [adminErrorCodes.ADMIN_INVALID_PAYMENT_AMOUNT]: `Enter a valid payment amount (positive number).`,
  [adminErrorCodes.ADMIN_INVALID_REVERSAL_AMOUNT]: `Enter a valid reversal amount (positive number).`,
  [adminErrorCodes.ADMIN_PAYMENT_REQUEST_ALREADY_FULLY_REVERSED]: `This request is already fully reversed.`,
  [adminErrorCodes.ADMIN_REVERSAL_AMOUNT_EXCEEDS_REMAINING_BALANCE]: `Reversal amount is higher than the remaining balance.`,
  [adminErrorCodes.ADMIN_STRIPE_PAYMENT_INTENT_NOT_FOUND_FOR_REFUND]: `Refund via Stripe is not available for this payment.`,
  [errorCodes.INSUFFICIENT_REQUESTER_BALANCE_REVERSAL_ADMIN]: `Requester balance is too low to perform this reversal.`,

  // Admin admins controller
  [adminErrorCodes.ADMIN_ONLY_SUPER_CAN_CHANGE_PASSWORDS]: `Only SUPER admins can change other admins’ passwords.`,
  [adminErrorCodes.ADMIN_ONLY_SUPER_CAN_UPDATE_ADMINS]: `Only SUPER admins can update admins.`,
  [adminErrorCodes.ADMIN_UNSUPPORTED_ADMIN_ACTION]: `This action is not supported.`,
  [adminErrorCodes.ADMIN_CANNOT_DELETE_YOURSELF]: `You cannot delete your own admin account.`,
  [adminErrorCodes.ADMIN_ONLY_SUPER_CAN_RUN_MIGRATIONS]: `Only SUPER admins can run system migrations.`,

  // Admin consumers — verification
  [adminErrorCodes.ADMIN_UNSUPPORTED_VERIFICATION_ACTION]: `This verification action is not supported.`,

  // Admin exchange — rates
  [adminErrorCodes.ADMIN_EXCHANGE_RATE_NOT_FOUND]: `This exchange rate was not found.`,
  [adminErrorCodes.ADMIN_SOURCE_AND_TARGET_CURRENCIES_MUST_DIFFER]: `Source and target currencies must be different.`,
  [adminErrorCodes.ADMIN_INVALID_EXCHANGE_RATE]: `Enter a valid rate (positive number).`,
  [adminErrorCodes.ADMIN_BID_RATE_CANNOT_EXCEED_ASK_RATE]: `Bid rate cannot be higher than ask rate.`,
  [adminErrorCodes.ADMIN_CONFIDENCE_MUST_BE_0_100]: `Confidence must be between 0 and 100.`,
  [adminErrorCodes.ADMIN_INVALID_EFFECTIVE_AT]: `Enter a valid effective date.`,
  [adminErrorCodes.ADMIN_INVALID_EXPIRES_AT]: `Enter a valid expiry date.`,
  [adminErrorCodes.ADMIN_EXPIRES_AT_MUST_BE_AFTER_EFFECTIVE_AT]: `Expiry date must be after the effective date.`,
  [adminErrorCodes.ADMIN_EFFECTIVE_AT_MUST_BE_UNIQUE_FOR_PAIR]: `A rate with this effective date already exists for this currency pair.`,

  // Admin exchange — rules
  [adminErrorCodes.ADMIN_RULE_NOT_FOUND]: `This rule was not found.`,
  [adminErrorCodes.ADMIN_INVALID_TARGET_BALANCE]: `Enter a valid target balance (0 or positive number).`,
  [adminErrorCodes.ADMIN_INVALID_MAX_CONVERT_AMOUNT]: `Enter a valid max convert amount (positive number).`,

  // Admin exchange — scheduled
  [adminErrorCodes.ADMIN_SCHEDULED_CONVERSION_NOT_FOUND]: `This scheduled conversion was not found.`,
  [adminErrorCodes.ADMIN_CONVERSION_ALREADY_EXECUTED]: `This conversion has already been executed.`,
  [adminErrorCodes.ADMIN_CONVERSION_ALREADY_CANCELLED]: `This conversion has already been cancelled.`,

  // Consumer codes (admin triggers rule run or scheduled execute via consumer exchange)
  [errorCodes.RULE_NOT_FOUND_CONVERT]: `This rule was not found or cannot be run.`,
  [errorCodes.SCHEDULED_CONVERSION_NOT_FOUND_EXECUTE]: `This scheduled conversion was not found.`,
  [errorCodes.CONVERSION_ALREADY_EXECUTED]: `This conversion has already been executed.`,
  [errorCodes.CONVERSION_CANCELLED]: `This conversion has already been cancelled.`,
  [errorCodes.CONVERSION_ALREADY_PROCESSING]: `This conversion is already in progress.`,
  [errorCodes.INSUFFICIENT_CURRENCY_BALANCE]: `Consumer has insufficient balance in the source currency.`,
};

/**
 * Maps API error code or message (from response) to a short admin-facing string.
 * Use when displaying API errors in toasts; pass fallback when code is unknown.
 */
export function getErrorMessageForUser(codeOrMessage: string | undefined, fallback: string): string {
  if (!codeOrMessage) return fallback;
  const mapped = API_ERROR_MAP[codeOrMessage];
  if (mapped) return mapped;
  return fallback;
}

// ---------------------------------------------------------------------------
// Local toast keys (client-side only)
// ---------------------------------------------------------------------------

/** Keys for admin client-side toasts. Use with getLocalToastMessage(). */
export const localToastKeys = {
  // Auth
  LOGIN_EMAIL_PASSWORD_REQUIRED: `LOGIN_EMAIL_PASSWORD_REQUIRED`,

  // Load errors (lists / dashboard / cards)
  LOAD_DASHBOARD_STATS: `LOAD_DASHBOARD_STATS`,
  LOAD_PAYMENT_REQUESTS: `LOAD_PAYMENT_REQUESTS`,
  LOAD_LEDGER_ENTRIES: `LOAD_LEDGER_ENTRIES`,
  LOAD_LEDGER_ANOMALIES: `LOAD_LEDGER_ANOMALIES`,
  LOAD_CONSUMERS: `LOAD_CONSUMERS`,
  LOAD_ADMINS: `LOAD_ADMINS`,
  LOAD_EXCHANGE_RATES: `LOAD_EXCHANGE_RATES`,
  LOAD_EXCHANGE_RULES: `LOAD_EXCHANGE_RULES`,
  LOAD_SCHEDULED_CONVERSIONS: `LOAD_SCHEDULED_CONVERSIONS`,
  LOAD_ARCHIVE_RECORDS: `LOAD_ARCHIVE_RECORDS`,
  LOAD_STATUS_TOTALS: `LOAD_STATUS_TOTALS`,
  LOAD_RECENT_REQUESTS: `LOAD_RECENT_REQUESTS`,
  LOAD_VERIFICATION_QUEUE: `LOAD_VERIFICATION_QUEUE`,

  // Payment request / reversal
  REVERSAL_ONLY_COMPLETED: `REVERSAL_ONLY_COMPLETED`,
  REVERSAL_VALID_AMOUNT: `REVERSAL_VALID_AMOUNT`,
  REVERSAL_CREATE_FAILED: `REVERSAL_CREATE_FAILED`,
  REVERSAL_CREATED: `REVERSAL_CREATED`,

  // Admins
  ADMIN_FORM_FIX_ERRORS: `ADMIN_FORM_FIX_ERRORS`,
  ADMIN_CREATE_FAILED: `ADMIN_CREATE_FAILED`,
  ADMIN_DELETE_FAILED: `ADMIN_DELETE_FAILED`,
  ADMIN_RESTORE_FAILED: `ADMIN_RESTORE_FAILED`,
  ADMIN_RESET_PASSWORD_FAILED: `ADMIN_RESET_PASSWORD_FAILED`,

  // Consumer verification
  VERIFICATION_UPDATE_FAILED: `VERIFICATION_UPDATE_FAILED`,

  // Exchange rates
  RATE_CREATE_FAILED: `RATE_CREATE_FAILED`,
  RATE_UPDATE_FAILED: `RATE_UPDATE_FAILED`,
  RATE_DELETE_FAILED: `RATE_DELETE_FAILED`,

  // Exchange rules
  RULE_UPDATE_FAILED: `RULE_UPDATE_FAILED`,
  RULE_RUN_FAILED: `RULE_RUN_FAILED`,
  RULE_EXECUTED_NO_CONVERSION: `RULE_EXECUTED_NO_CONVERSION`,

  // Scheduled conversions
  SCHEDULED_CANCEL_FAILED: `SCHEDULED_CANCEL_FAILED`,
  SCHEDULED_EXECUTE_FAILED: `SCHEDULED_EXECUTE_FAILED`,

  // Generic
  UNEXPECTED_ERROR: `UNEXPECTED_ERROR`,
} as const;

export type LocalToastKey = (typeof localToastKeys)[keyof typeof localToastKeys];

const LOCAL_TOAST_MESSAGE_MAP: Record<string, string> = {
  // Auth — login form
  [localToastKeys.LOGIN_EMAIL_PASSWORD_REQUIRED]: `Email and password required`,

  // Load errors — shown on the page that failed (dashboard, list, or dashboard card)
  [localToastKeys.LOAD_DASHBOARD_STATS]: `Couldn't load dashboard`,
  [localToastKeys.LOAD_PAYMENT_REQUESTS]: `Couldn't load payment requests`,
  [localToastKeys.LOAD_LEDGER_ENTRIES]: `Couldn't load ledger`,
  [localToastKeys.LOAD_LEDGER_ANOMALIES]: `Couldn't load anomalies`,
  [localToastKeys.LOAD_CONSUMERS]: `Couldn't load consumers`,
  [localToastKeys.LOAD_ADMINS]: `Couldn't load admins`,
  [localToastKeys.LOAD_EXCHANGE_RATES]: `Couldn't load rates`,
  [localToastKeys.LOAD_EXCHANGE_RULES]: `Couldn't load rules`,
  [localToastKeys.LOAD_SCHEDULED_CONVERSIONS]: `Couldn't load scheduled conversions`,
  [localToastKeys.LOAD_ARCHIVE_RECORDS]: `Couldn't load archive`,
  [localToastKeys.LOAD_STATUS_TOTALS]: `Couldn't load status totals`,
  [localToastKeys.LOAD_RECENT_REQUESTS]: `Couldn't load recent requests`,
  [localToastKeys.LOAD_VERIFICATION_QUEUE]: `Couldn't load verification queue`,

  // Payment request detail — reversal form / confirm
  [localToastKeys.REVERSAL_ONLY_COMPLETED]: `Only completed requests can be reversed`,
  [localToastKeys.REVERSAL_VALID_AMOUNT]: `Enter a valid amount`,
  [localToastKeys.REVERSAL_CREATE_FAILED]: `Couldn't create reversal`,
  [localToastKeys.REVERSAL_CREATED]: `Reversal created`,

  // Admins page — create modal, row actions, reset-password modal
  [localToastKeys.ADMIN_FORM_FIX_ERRORS]: `Fix form errors`,
  [localToastKeys.ADMIN_CREATE_FAILED]: `Couldn't create admin`,
  [localToastKeys.ADMIN_DELETE_FAILED]: `Couldn't delete admin`,
  [localToastKeys.ADMIN_RESTORE_FAILED]: `Couldn't restore admin`,
  [localToastKeys.ADMIN_RESET_PASSWORD_FAILED]: `Couldn't reset password`,

  // Consumer detail — verification actions
  [localToastKeys.VERIFICATION_UPDATE_FAILED]: `Couldn't update verification`,

  // Exchange rates page — create / edit / delete rate
  [localToastKeys.RATE_CREATE_FAILED]: `Couldn't create rate`,
  [localToastKeys.RATE_UPDATE_FAILED]: `Couldn't update rate`,
  [localToastKeys.RATE_DELETE_FAILED]: `Couldn't delete rate`,

  // Exchange rules page — toggle, run now
  [localToastKeys.RULE_UPDATE_FAILED]: `Couldn't update rule`,
  [localToastKeys.RULE_RUN_FAILED]: `Couldn't run rule`,
  [localToastKeys.RULE_EXECUTED_NO_CONVERSION]: `Rule ran, no conversion`,

  // Scheduled conversions page — cancel, execute
  [localToastKeys.SCHEDULED_CANCEL_FAILED]: `Couldn't cancel`,
  [localToastKeys.SCHEDULED_EXECUTE_FAILED]: `Couldn't execute`,

  // Fallback when no key or API message
  [localToastKeys.UNEXPECTED_ERROR]: `Something went wrong`,
};

/**
 * Returns the user-facing message for a local toast key.
 * Use for all admin toasts; pass optional fallback for API error.message.
 */
export function getLocalToastMessage(key: string, fallback?: string): string {
  const mapped = LOCAL_TOAST_MESSAGE_MAP[key];
  if (mapped) return mapped;
  return fallback ?? LOCAL_TOAST_MESSAGE_MAP[localToastKeys.UNEXPECTED_ERROR] ?? `Something went wrong`;
}
