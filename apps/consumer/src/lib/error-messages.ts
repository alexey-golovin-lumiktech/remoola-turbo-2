/* eslint-disable max-len */
import { errorCodes } from '@remoola/shared-constants';

/**
 * Maps each API error code (unique per throw site) to a user-facing message.
 * Each message describes exactly what caused the exception and what the user can do.
 */
const MESSAGE_MAP: Record<string, string> = {
  // Payments – withdrawals & transfers
  [errorCodes.INSUFFICIENT_BALANCE_WITHDRAW]: `You don't have enough balance to complete this withdrawal. Add funds or reduce the amount.`,
  [errorCodes.INSUFFICIENT_BALANCE_TRANSFER]: `You don't have enough balance to send this amount. Add funds or choose a lower amount.`,
  [errorCodes.PAYMENT_REQUEST_NOT_FOUND_GET]: `This payment request could not be found. It may have been removed or the link is incorrect.`,
  [errorCodes.PAYMENT_REQUEST_NOT_FOUND_SEND_DRAFT]: `This payment request could not be found. You can't send a request that no longer exists.`,
  [errorCodes.PAYMENT_ACCESS_DENIED_GET]: `You don't have permission to view this payment. Only the payer or requester can see it.`,
  [errorCodes.PAYMENT_ACCESS_DENIED_SEND_DRAFT]: `You don't have permission to send this request. Only the requester can send a draft.`,
  [errorCodes.RECIPIENT_NOT_FOUND_START_PAYMENT]: `We couldn't find an account for this recipient. Check the email address and try again.`,
  [errorCodes.RECIPIENT_NOT_FOUND_TRANSFER]: `We couldn't find the recipient by email or phone. Please check and try again.`,
  [errorCodes.CANNOT_TRANSFER_TO_SELF_START_PAYMENT]: `You can't send a payment to your own email. Use a different recipient.`,
  [errorCodes.CANNOT_TRANSFER_TO_SELF_TRANSFER]: `You can't transfer money to yourself. Enter a different recipient.`,
  [errorCodes.INVALID_AMOUNT_START_PAYMENT]: `Please enter a valid payment amount (a positive number).`,
  [errorCodes.INVALID_AMOUNT_CREATE_REQUEST]: `Please enter a valid amount for the payment request (a positive number).`,
  [errorCodes.INVALID_AMOUNT_SEND_DRAFT]: `This payment request has an invalid amount. Edit it or create a new one.`,
  [errorCodes.INVALID_AMOUNT_WITHDRAW]: `Please enter a valid withdrawal amount (a positive number).`,
  [errorCodes.INVALID_AMOUNT_TRANSFER]: `Please enter a valid transfer amount (a positive number).`,
  [errorCodes.REQUEST_FROM_SELF_BY_ID]: `You can't request payment from yourself. Use a different recipient email.`,
  [errorCodes.REQUEST_FROM_SELF_BY_EMAIL]: `You can't request payment from your own email. Use a different recipient.`,
  [errorCodes.INVALID_DATE]: `The date you entered is invalid. Please use a valid date format.`,
  [errorCodes.ONLY_DRAFT_REQUESTS_CAN_BE_SENT]: `Only draft payment requests can be sent. This request was already sent or is in another state.`,
  [errorCodes.INVALID_LEDGER_STATE_EMAIL_PAYMENT_SEND]: `This payment request is in an unexpected state and can't be sent. Please refresh and try again or contact support.`,
  [errorCodes.INVALID_LEDGER_STATE_DRAFT]: `This draft payment request is in an unexpected state. Please refresh and try again or contact support.`,
  [errorCodes.AMOUNT_EXCEEDS_PER_OPERATION_LIMIT]: `This amount exceeds your per-transaction limit. Please enter a smaller amount or contact support to adjust your limits.`,
  [errorCodes.AMOUNT_EXCEEDS_DAILY_LIMIT]: `This amount would exceed your daily limit. You can try again tomorrow or use a smaller amount.`,

  // Auth – login, signup, password, session
  [errorCodes.ACCOUNT_SUSPENDED]: `Your account has been suspended. Please contact support to resolve this.`,
  [errorCodes.PROFILE_SUSPENDED]: `Your profile has been suspended. Please contact support for assistance.`,
  [errorCodes.INVALID_CREDENTIALS]: `The email or password you entered is incorrect. Please try again or reset your password.`,
  [errorCodes.NO_IDENTITY_RECORD]: `Your session could not be found. Please sign in again.`,
  [errorCodes.INVALID_REFRESH_TOKEN]: `Your session has expired. Please sign in again.`,
  [errorCodes.INVALID_OAUTH_EXCHANGE_TOKEN]: `Your sign-in link has expired or is invalid. Please start the sign-in process again.`,
  [errorCodes.INVALID_GOOGLE_SIGNUP_TOKEN]: `This sign-up link is invalid or has expired. Please try signing up with Google again.`,
  [errorCodes.GOOGLE_SIGNUP_MISSING_EMAIL]: `Your Google account doesn't provide an email we can use. Please use another sign-in method or contact support.`,
  [errorCodes.GOOGLE_EMAIL_NOT_VERIFIED_SIGNUP]: `Your Google email must be verified before we can use it to sign up. Verify it in your Google account and try again.`,
  [errorCodes.EMAIL_REQUIRED]: `Please enter your email address to continue.`,
  [errorCodes.CONSUMER_NOT_FOUND_FOR_EMAIL]: `We don't have an account with this email. Check the address or sign up if you're new.`,
  [errorCodes.TOKEN_REQUIRED]: `A security token is required for this action. Please use the link from your email or try again.`,
  [errorCodes.PASSWORD_REQUIRED]: `Please enter your password to continue.`,
  [errorCodes.INVALID_CHANGE_PASSWORD_TOKEN]: `This password reset link has expired or is invalid. Request a new link from the forgot-password page.`,
  [errorCodes.CONSUMER_NOT_FOUND_CHANGE_PASSWORD]: `We couldn't find your account for this password reset. Please request a new reset link.`,
  [errorCodes.CHANGE_PASSWORD_FLOW_EXPIRED]: `This password reset has expired. Please request a new link from the forgot-password page.`,
  [errorCodes.CONSUMER_NOT_FOUND_COMPLETE_PROFILE]: `We couldn't find your account to send the verification email. Please sign in again or contact support.`,
  [errorCodes.EMAIL_MISMATCH_GOOGLE]: `The email you entered doesn't match your Google account. Please use the same email or sign in with Google.`,
  [errorCodes.EMAIL_ALREADY_REGISTERED_SIGNUP]: `This email is already registered. Sign in instead or use a different email to sign up.`,
  [errorCodes.EMAIL_ALREADY_REGISTERED_PRISMA]: `This email is already in use. Please sign in or use a different email.`,
  [errorCodes.PASSWORD_REQUIREMENTS]: `Your password must be at least 8 characters long. Please choose a stronger password.`,
  [errorCodes.CONTRACTOR_KIND_REQUIRED]: `Please select your contractor type (e.g. individual or entity) to continue.`,
  [errorCodes.CONTRACTOR_KIND_NOT_FOR_BUSINESS]: `Contractor type is only for contractor accounts. Remove it or switch to the correct account type.`,
  [errorCodes.PERSONAL_DETAILS_REQUIRED]: `Personal details are required for individual contractors. Please fill them in to continue.`,
  [errorCodes.ORGANIZATION_DETAILS_REQUIRED]: `Organization details are required for this account type. Please fill them in to continue.`,
  [errorCodes.INVALID_DATE_OF_BIRTH]: `The date of birth you entered is invalid. Please use a valid date.`,

  // Google OAuth – callback vs login
  [errorCodes.GOOGLE_ACCOUNT_NO_EMAIL_CALLBACK]: `We couldn't get your email from Google after sign-in. Please try again or use another method.`,
  [errorCodes.GOOGLE_ACCOUNT_NO_EMAIL_LOGIN]: `Your Google account doesn't have an email we can use. Please use another sign-in method.`,
  [errorCodes.GOOGLE_EMAIL_NOT_VERIFIED_CALLBACK]: `Your Google email must be verified before you can sign in. Verify it in your Google account and try again.`,
  [errorCodes.GOOGLE_EMAIL_NOT_VERIFIED_LOGIN]: `Please verify your Google email in your Google account, then try signing in again.`,
  [errorCodes.INVALID_GOOGLE_TOKEN_PAYLOAD]: `Google sign-in returned invalid data. Please try again or use email and password.`,
  [errorCodes.MISSING_GOOGLE_NONCE]: `Your sign-in session is invalid or expired. Please start the Google sign-in again from the login page.`,
  [errorCodes.INVALID_GOOGLE_NONCE]: `Your sign-in session doesn't match. Please start the Google sign-in again from the login page.`,
  [errorCodes.INVALID_GOOGLE_ID_TOKEN]: `Google sign-in failed because the token was invalid. Please try again.`,
  [errorCodes.MISSING_GOOGLE_ID_TOKEN]: `Google didn't return the required sign-in data. Please try signing in with Google again.`,
  [errorCodes.GOOGLE_ACCOUNT_MISMATCH]: `This Google account is already linked to another user. Sign in with that account or use a different Google account.`,
  [errorCodes.MISSING_SIGNUP_TOKEN]: `The sign-up link is missing. Please open the link from your sign-up email or start sign-up again.`,
  [errorCodes.MISSING_EXCHANGE_TOKEN]: `The sign-in link is missing. Please complete sign-in from the login page.`,
  [errorCodes.ORIGIN_REQUIRED]: `We need to know where the request came from. Please try again from the app; if it persists, contact support.`,

  // Contacts
  [errorCodes.CONTACT_NOT_FOUND]: `This contact could not be found. It may have been removed or the link is incorrect.`,
  [errorCodes.CONTACT_EMAIL_ALREADY_EXISTS]: `You already have a contact with this email. Use a different email or edit the existing contact.`,

  // Exchange – rates, rules, scheduled conversions
  [errorCodes.RATE_NOT_AVAILABLE]: `An exchange rate for this currency pair isn't available right now. Try again later.`,
  [errorCodes.RATE_STALE]: `The exchange rate has expired. Please refresh the page to get the latest rate.`,
  [errorCodes.CURRENCIES_MUST_DIFFER_CREATE_RULE]: `When creating an auto-conversion rule, the source and target currencies must be different.`,
  [errorCodes.CURRENCIES_MUST_DIFFER_UPDATE_RULE]: `The source and target currencies in your rule must be different. Please choose two different currencies.`,
  [errorCodes.CURRENCIES_MUST_DIFFER_SCHEDULE]: `For a scheduled conversion, the source and target currencies must be different.`,
  [errorCodes.INVALID_TARGET_BALANCE_CREATE_RULE]: `Please enter a valid target balance (0 or a positive number) for this auto-conversion rule.`,
  [errorCodes.INVALID_TARGET_BALANCE_UPDATE_RULE]: `Please enter a valid target balance (0 or a positive number) for the rule.`,
  [errorCodes.INVALID_MAX_CONVERT_AMOUNT_CREATE_RULE]: `Please enter a valid maximum conversion amount (a positive number) for this rule.`,
  [errorCodes.INVALID_MAX_CONVERT_AMOUNT_UPDATE_RULE]: `Please enter a valid maximum conversion amount (a positive number) for the rule.`,
  [errorCodes.RULE_NOT_FOUND_UPDATE]: `This conversion rule could not be found for updating. It may have been deleted.`,
  [errorCodes.RULE_NOT_FOUND_DELETE]: `This conversion rule could not be found for deletion. It may already be deleted.`,
  [errorCodes.RULE_NOT_FOUND_CONVERT]: `This conversion rule could not be found. It may have been deleted or disabled.`,
  [errorCodes.INVALID_EXECUTE_AT]: `The scheduled time you entered is invalid. Please use a valid date and time.`,
  [errorCodes.EXECUTE_AT_MUST_BE_FUTURE]: `The scheduled time must be in the future. Please choose a later date and time.`,
  [errorCodes.SCHEDULED_CONVERSION_NOT_FOUND_CANCEL]: `This scheduled conversion could not be found for cancellation. It may already be cancelled or executed.`,
  [errorCodes.SCHEDULED_CONVERSION_NOT_FOUND_EXECUTE]: `This scheduled conversion could not be found. It may have been cancelled or already executed.`,
  [errorCodes.ONLY_PENDING_CONVERSIONS_CAN_CANCEL]: `Only pending scheduled conversions can be cancelled. This one is already executed or cancelled.`,
  [errorCodes.CONVERSION_ALREADY_EXECUTED]: `This conversion has already been executed. No further action is needed.`,
  [errorCodes.CONVERSION_CANCELLED]: `This conversion was cancelled. Create a new scheduled conversion if you still want to convert.`,
  [errorCodes.CONVERSION_ALREADY_PROCESSING]: `This conversion is already in progress. Please wait; you'll see the result shortly.`,
  [errorCodes.CANNOT_CONVERT_SAME_CURRENCY]: `You can't convert a currency to itself. Choose a different target currency.`,
  [errorCodes.INVALID_AMOUNT_SCHEDULE]: `Please enter a valid amount (a positive number) for the scheduled conversion.`,
  [errorCodes.INVALID_AMOUNT_CONVERT]: `Please enter a valid amount (a positive number) to convert.`,
  [errorCodes.INSUFFICIENT_CURRENCY_BALANCE]: `You don't have enough balance in the source currency to complete this conversion.`,

  // Payment methods / Stripe – pay, confirm, add card
  [errorCodes.PAYMENT_NOT_FOUND_STRIPE_CONSUMER]: `We couldn't find your account or email for this payment. Please sign in again and retry.`,
  [errorCodes.PAYMENT_NOT_FOUND_STRIPE_REQUEST]: `This payment request could not be found. The link may be wrong or the request was removed.`,
  [errorCodes.PAYMENT_NOT_FOUND_STRIPE_ACCESS]: `You don't have access to this payment request, or it doesn't exist. Check the link and try again.`,
  [errorCodes.PAYMENT_NOT_FOUND_STRIPE_CLAIM]: `We couldn't claim this payment for your account. It may have been claimed already or the link expired.`,
  [errorCodes.PAYMENT_NOT_FOUND_STRIPE_CONFIRM]: `This payment could not be found for payment with card. The request may have been removed or you're not the payer.`,
  [errorCodes.PAYMENT_ALREADY_PROCESSED_CONFIRM]: `This payment has already been completed. You don't need to pay again.`,
  [errorCodes.PAYMENT_ALREADY_PROCESSED_PAY]: `This payment has already been processed. Check your transaction history.`,
  [errorCodes.INVALID_LEDGER_STATE_EMAIL_PAYMENT_STRIPE]: `This payment is in an unexpected state for card payment. Please refresh and try again or contact support.`,
  [errorCodes.CONSUMER_NOT_FOUND_STRIPE]: `We couldn't find your account to set up payment. Please sign in again and retry.`,
  [errorCodes.CONSUMER_NOT_FOUND_WEBHOOK]: `We couldn't find your account for this payment notification. If you completed a payment, it may still process; check your balance.`,
  [errorCodes.STRIPE_NO_CLIENT_SECRET]: `We couldn't start the payment setup. Please try again; if it keeps failing, try another browser or contact support.`,
  [errorCodes.STRIPE_SETUP_INTENT_NOT_SUCCEEDED]: `Adding your card didn't complete successfully. Please try again and complete the verification step.`,
  [errorCodes.STRIPE_NO_PAYMENT_METHOD]: `We couldn't get the card details from the previous step. Please try adding your card again.`,
  [errorCodes.ONLY_CARD_PAYMENT_METHODS]: `Only card payments are supported right now. Please use a debit or credit card.`,
  [errorCodes.PAYMENT_METHOD_NOT_FOUND]: `This saved payment method could not be found. It may have been removed. Please select another or add a new card.`,
  [errorCodes.PAYMENT_METHOD_CANNOT_REUSE_NO_ID]: `This payment method can't be used because it's not fully set up. Please add a new card.`,
  [errorCodes.PAYMENT_METHOD_CANNOT_REUSE_ATTACH]: `This card can't be used again for security reasons. Please add a new card to pay.`,
  [errorCodes.PAYMENT_METHOD_CANNOT_REUSE_VERIFY]: `This card can't be used again. Please add a new card and try the payment again.`,

  // Invoice, Documents
  [errorCodes.PAYMENT_REQUEST_NOT_FOUND_INVOICE]: `We couldn't find this payment request to generate the invoice. The link may be wrong or the request was removed.`,
  [errorCodes.INVOICE_ACCESS_DENIED]: `You don't have permission to view this invoice. Only the payer or requester can access it.`,
  [errorCodes.PAYMENT_NOT_OWNED]: `This payment wasn't found or you don't have access to it. Only the payer or requester can access these documents.`,
  [errorCodes.DOCUMENT_ACCESS_DENIED]: `You don't have permission to view or edit this document. Check that you're signed in to the correct account.`,
};

/**
 * Maps API error code or message to a user-facing string.
 * Use when displaying API errors (toast, inline, etc.).
 */
export function getErrorMessageForUser(codeOrMessage: string | undefined, fallback: string): string {
  if (!codeOrMessage) return fallback;
  const mapped = MESSAGE_MAP[codeOrMessage];
  if (mapped) return mapped;
  return fallback;
}

// ---------------------------------------------------------------------------
// Local / client-side toast messages (not from API error codes)
// ---------------------------------------------------------------------------

/** Keys for client-side toasts. Use these with getLocalToastMessage(). */
export const localToastKeys = {
  // Validation (forms before submit)
  VALIDATION_AMOUNT: `VALIDATION_AMOUNT`,
  VALIDATION_AMOUNT_WITHDRAW: `VALIDATION_AMOUNT_WITHDRAW`,
  VALIDATION_AMOUNT_TRANSFER: `VALIDATION_AMOUNT_TRANSFER`,
  VALIDATION_RECIPIENT_EMAIL: `VALIDATION_RECIPIENT_EMAIL`,
  VALIDATION_WITHDRAWAL_METHOD: `VALIDATION_WITHDRAWAL_METHOD`,
  VALIDATION_PASSWORDS_MISMATCH: `VALIDATION_PASSWORDS_MISMATCH`,
  VALIDATION_SIGNUP_DETAILS: `VALIDATION_SIGNUP_DETAILS`,

  // Documents
  DOCUMENTS_UPLOAD_FAILED: `DOCUMENTS_UPLOAD_FAILED`,
  DOCUMENTS_DELETE_FAILED: `DOCUMENTS_DELETE_FAILED`,
  DOCUMENTS_SELECT_AND_PAYMENT_ID: `DOCUMENTS_SELECT_AND_PAYMENT_ID`,
  DOCUMENTS_ATTACH_FAILED: `DOCUMENTS_ATTACH_FAILED`,
  DOCUMENTS_UPDATE_TAGS_FAILED: `DOCUMENTS_UPDATE_TAGS_FAILED`,

  // Payment methods
  PAYMENT_METHOD_DELETE_FAILED: `PAYMENT_METHOD_DELETE_FAILED`,
  PAYMENT_METHOD_SETUP_INTENT_FAILED: `PAYMENT_METHOD_SETUP_INTENT_FAILED`,
  PAYMENT_METHOD_ADD_FAILED: `PAYMENT_METHOD_ADD_FAILED`,

  // Payments (client-side / generic)
  PAYMENT_NOT_FOUND: `PAYMENT_NOT_FOUND`,
  PAYMENT_REQUIRES_ACTION: `PAYMENT_REQUIRES_ACTION`,
  PAYMENT_START_FAILED: `PAYMENT_START_FAILED`,
  PAYMENT_SEND_REQUEST_FAILED: `PAYMENT_SEND_REQUEST_FAILED`,
  PAYMENT_REQUEST_CREATE_FAILED: `PAYMENT_REQUEST_CREATE_FAILED`,
  PAYMENT_CONTINUE_FAILED: `PAYMENT_CONTINUE_FAILED`,

  // Settings / profile
  PROFILE_LOAD_FAILED: `PROFILE_LOAD_FAILED`,
  PROFILE_UPDATE_FAILED: `PROFILE_UPDATE_FAILED`,
  THEME_UPDATE_FAILED: `THEME_UPDATE_FAILED`,
  PASSWORD_CHANGE_FAILED: `PASSWORD_CHANGE_FAILED`,

  // Exchange
  RATE_FETCH_FAILED: `RATE_FETCH_FAILED`,
  CONVERSION_FAILED: `CONVERSION_FAILED`,
  RULE_SAVE_FAILED: `RULE_SAVE_FAILED`,
  RULE_UPDATE_FAILED: `RULE_UPDATE_FAILED`,
  RULE_DELETE_FAILED: `RULE_DELETE_FAILED`,
  SCHEDULED_CONVERSION_SCHEDULE_FAILED: `SCHEDULED_CONVERSION_SCHEDULE_FAILED`,
  SCHEDULED_CONVERSION_CANCEL_FAILED: `SCHEDULED_CONVERSION_CANCEL_FAILED`,

  // Contacts
  CONTACT_UNEXPECTED_ERROR: `CONTACT_UNEXPECTED_ERROR`,

  // Generic
  UNEXPECTED_ERROR: `UNEXPECTED_ERROR`,
} as const;

export type LocalToastKey = (typeof localToastKeys)[keyof typeof localToastKeys];

/**
 * Maps for client-side / non-API toast messages.
 * Each value describes exactly what caused the toast and what the user can do.
 */
const LOCAL_TOAST_MESSAGE_MAP: Record<string, string> = {
  // Validation – form submitted with invalid or missing data (before API call)
  [localToastKeys.VALIDATION_AMOUNT]: `Please enter a valid amount: a positive number. Leave no field empty or zero.`,
  [localToastKeys.VALIDATION_AMOUNT_WITHDRAW]: `Please enter a valid withdrawal amount (a positive number) before continuing.`,
  [localToastKeys.VALIDATION_AMOUNT_TRANSFER]: `Please enter a valid transfer amount (a positive number) before sending.`,
  [localToastKeys.VALIDATION_RECIPIENT_EMAIL]: `Please enter the recipient's email address so we know where to send the money.`,
  [localToastKeys.VALIDATION_WITHDRAWAL_METHOD]: `Please choose where to send the money: Card or Bank account.`,
  [localToastKeys.VALIDATION_PASSWORDS_MISMATCH]: `The "New password" and "Confirm password" fields don't match. Please type the same password in both.`,
  [localToastKeys.VALIDATION_SIGNUP_DETAILS]: `Some required fields are missing or invalid. Please check the form and fix the highlighted errors before continuing.`,

  // Documents – upload, delete, attach, tag (client or request failed)
  [localToastKeys.DOCUMENTS_UPLOAD_FAILED]: `The file upload didn't complete. Check your connection and file size, then try again.`,
  [localToastKeys.DOCUMENTS_DELETE_FAILED]: `We couldn't delete the selected documents. Please try again; if it keeps failing, refresh the page.`,
  [localToastKeys.DOCUMENTS_SELECT_AND_PAYMENT_ID]: `To attach documents, select at least one document and choose the payment request they belong to.`,
  [localToastKeys.DOCUMENTS_ATTACH_FAILED]: `We couldn't attach the selected documents to that payment request. Please try again or choose another request.`,
  [localToastKeys.DOCUMENTS_UPDATE_TAGS_FAILED]: `We couldn't save the tag changes for this document. Please try again.`,

  // Payment methods – delete, setup intent, add card (client or API failed)
  [localToastKeys.PAYMENT_METHOD_DELETE_FAILED]: `We couldn't remove this saved card. Please try again; if it keeps failing, refresh the page.`,
  [localToastKeys.PAYMENT_METHOD_SETUP_INTENT_FAILED]: `We couldn't start the "add card" step. Check your connection and try again, or use a different browser.`,
  [localToastKeys.PAYMENT_METHOD_ADD_FAILED]: `We couldn't save your card. Complete the verification step (e.g. 3D Secure) and try again, or add a different card.`,

  // Payments – load, action required, start, send, create, continue (client-side or generic failure)
  [localToastKeys.PAYMENT_NOT_FOUND]: `This payment isn't available. The link may be wrong, or the payment was removed. Check your payment list or the link you used.`,
  [localToastKeys.PAYMENT_REQUIRES_ACTION]: `This payment needs you to do something next (e.g. confirm with your bank). Check your email or your payment method for instructions.`,
  [localToastKeys.PAYMENT_START_FAILED]: `We couldn't open the payment flow. Please try again; if you were paying with a card, try another card or payment method.`,
  [localToastKeys.PAYMENT_SEND_REQUEST_FAILED]: `We couldn't send the payment request to the recipient. Please try again.`,
  [localToastKeys.PAYMENT_REQUEST_CREATE_FAILED]: `We couldn't create the payment request. Check the amount and recipient, then try again.`,
  [localToastKeys.PAYMENT_CONTINUE_FAILED]: `We couldn't complete this step. Refresh the page and try again, or pick up where you left off from your payment list.`,

  // Settings / profile – load or save failed
  [localToastKeys.PROFILE_LOAD_FAILED]: `We couldn't load your profile. Refresh the page to try again.`,
  [localToastKeys.PROFILE_UPDATE_FAILED]: `We couldn't save your profile changes. Please try again; if it keeps failing, refresh and re-enter your details.`,
  [localToastKeys.THEME_UPDATE_FAILED]: `We couldn't save your theme preference. Please try again.`,
  [localToastKeys.PASSWORD_CHANGE_FAILED]: `We couldn't change your password. Check your current password and try again, or request a password reset.`,

  // Exchange – rate fetch, conversion, rules, scheduled conversions
  [localToastKeys.RATE_FETCH_FAILED]: `We couldn't load the exchange rate. Please try again in a moment.`,
  [localToastKeys.CONVERSION_FAILED]: `The currency conversion didn't complete. Please try again; if it keeps failing, check your balance and the amount.`,
  [localToastKeys.RULE_SAVE_FAILED]: `We couldn't save this auto-conversion rule. Check the amounts and currencies, then try again.`,
  [localToastKeys.RULE_UPDATE_FAILED]: `We couldn't update this conversion rule. Please try again.`,
  [localToastKeys.RULE_DELETE_FAILED]: `We couldn't delete this rule. Please try again or refresh the page.`,
  [localToastKeys.SCHEDULED_CONVERSION_SCHEDULE_FAILED]: `We couldn't schedule this conversion. Check the amount and time, then try again.`,
  [localToastKeys.SCHEDULED_CONVERSION_CANCEL_FAILED]: `We couldn't cancel this scheduled conversion. Please try again or refresh the page.`,

  // Contacts – unexpected error in contact flow (create/delete/etc.)
  [localToastKeys.CONTACT_UNEXPECTED_ERROR]: `Something went wrong while updating your contacts. Please try again.`,

  // Generic – unknown or unspecified failure
  [localToastKeys.UNEXPECTED_ERROR]: `Something went wrong. Please try again. If it keeps happening, contact support.`,
};

/**
 * Returns the user-facing message for a local (non-API) toast key.
 * Use for client-side validation, failed requests without API error code, etc.
 */
export function getLocalToastMessage(key: string, fallback?: string): string {
  const mapped = LOCAL_TOAST_MESSAGE_MAP[key];
  if (mapped) return mapped;
  return (
    fallback ?? LOCAL_TOAST_MESSAGE_MAP[localToastKeys.UNEXPECTED_ERROR] ?? `Something went wrong. Please try again.`
  );
}
