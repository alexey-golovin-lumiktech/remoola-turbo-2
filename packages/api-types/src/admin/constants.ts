/**
 * Admin-only enums used in list query params (aligned with DB enums).
 */

export const AdminTypes = {
  SUPER: `SUPER`,
  ADMIN: `ADMIN`,
} as const;
export type TAdminType = (typeof AdminTypes)[keyof typeof AdminTypes];

export const LedgerEntryTypes = {
  USER_PAYMENT: `USER_PAYMENT`,
  USER_PAYMENT_REVERSAL: `USER_PAYMENT_REVERSAL`,
  PLATFORM_FEE: `PLATFORM_FEE`,
  PLATFORM_FEE_REVERSAL: `PLATFORM_FEE_REVERSAL`,
  USER_DEPOSIT: `USER_DEPOSIT`,
  USER_DEPOSIT_REVERSAL: `USER_DEPOSIT_REVERSAL`,
  USER_PAYOUT: `USER_PAYOUT`,
  USER_PAYOUT_REVERSAL: `USER_PAYOUT_REVERSAL`,
  INTERNAL_TRANSFER: `INTERNAL_TRANSFER`,
  CURRENCY_EXCHANGE: `CURRENCY_EXCHANGE`,
} as const;
export type TLedgerEntryType = (typeof LedgerEntryTypes)[keyof typeof LedgerEntryTypes];

export const ScheduledFxConversionStatuses = {
  PENDING: `PENDING`,
  PROCESSING: `PROCESSING`,
  EXECUTED: `EXECUTED`,
  FAILED: `FAILED`,
  CANCELLED: `CANCELLED`,
} as const;
export type TScheduledFxConversionStatus =
  (typeof ScheduledFxConversionStatuses)[keyof typeof ScheduledFxConversionStatuses];
