'use server';

import {
  addBankAccountMutation as addBankAccountMutationImpl,
  addCardMutation as addCardMutationImpl,
  confirmReusableCardSetupIntentMutation as confirmReusableCardSetupIntentMutationImpl,
  createReusableCardSetupIntentMutation as createReusableCardSetupIntentMutationImpl,
  deletePaymentMethodMutation as deletePaymentMethodMutationImpl,
  setDefaultPaymentMethodMutation as setDefaultPaymentMethodMutationImpl,
} from './mutations/banking.server';
import {
  createContactMutation as createContactMutationImpl,
  deleteContactMutation as deleteContactMutationImpl,
  hasSavedContactByEmailQuery as hasSavedContactByEmailQueryImpl,
  updateContactMutation as updateContactMutationImpl,
} from './mutations/contacts.server';
import {
  bulkDeleteDocumentsMutation as bulkDeleteDocumentsMutationImpl,
  deleteDocumentMutation as deleteDocumentMutationImpl,
  updateDocumentTagsMutation as updateDocumentTagsMutationImpl,
} from './mutations/documents.server';
import {
  cancelScheduledExchangeMutation as cancelScheduledExchangeMutationImpl,
  convertExchangeMutation as convertExchangeMutationImpl,
  createExchangeRuleMutation as createExchangeRuleMutationImpl,
  deleteExchangeRuleMutation as deleteExchangeRuleMutationImpl,
  getExchangeQuoteMutation as getExchangeQuoteMutationImpl,
  refreshExchangeRatesMutation as refreshExchangeRatesMutationImpl,
  scheduleExchangeMutation as scheduleExchangeMutationImpl,
  updateExchangeRuleMutation as updateExchangeRuleMutationImpl,
} from './mutations/exchange.server';
import {
  attachDocumentToDraftPaymentRequestsMutation as attachDocumentToDraftPaymentRequestsMutationImpl,
  attachDocumentsToPaymentRequestMutation as attachDocumentsToPaymentRequestMutationImpl,
  createPaymentCheckoutSessionMutation as createPaymentCheckoutSessionMutationImpl,
  createPaymentRequestMutation as createPaymentRequestMutationImpl,
  detachDocumentFromPaymentRequestMutation as detachDocumentFromPaymentRequestMutationImpl,
  generateInvoiceMutation as generateInvoiceMutationImpl,
  getDraftPaymentRequestsAction as getDraftPaymentRequestsActionImpl,
  payWithSavedMethodMutation as payWithSavedMethodMutationImpl,
  sendPaymentRequestMutation as sendPaymentRequestMutationImpl,
  startPaymentMutation as startPaymentMutationImpl,
  startVerificationSessionMutation as startVerificationSessionMutationImpl,
  submitTransferAction as submitTransferActionImpl,
  submitWithdrawAction as submitWithdrawActionImpl,
} from './mutations/payments.server';
import {
  changePasswordMutation as changePasswordMutationImpl,
  updateProfileMutation as updateProfileMutationImpl,
  updateSettingsMutation as updateSettingsMutationImpl,
} from './mutations/settings.server';

export type DraftPaymentRequestOption = {
  id: string;
  amount: number;
  currencyCode: string;
  createdAt: string;
  description: string | null;
  counterpartyEmail: string | null;
};

export type DraftPaymentRequestsResult =
  | {
      ok: true;
      items: DraftPaymentRequestOption[];
      total: number;
      page: number;
      pageSize: number;
    }
  | { ok: false; error: { code: string; message: string } };

export async function createPaymentRequestMutation(
  ...args: Parameters<typeof createPaymentRequestMutationImpl>
): ReturnType<typeof createPaymentRequestMutationImpl> {
  return createPaymentRequestMutationImpl(...args);
}

export async function startPaymentMutation(
  ...args: Parameters<typeof startPaymentMutationImpl>
): ReturnType<typeof startPaymentMutationImpl> {
  return startPaymentMutationImpl(...args);
}

export async function sendPaymentRequestMutation(
  ...args: Parameters<typeof sendPaymentRequestMutationImpl>
): ReturnType<typeof sendPaymentRequestMutationImpl> {
  return sendPaymentRequestMutationImpl(...args);
}

export async function attachDocumentsToPaymentRequestMutation(
  ...args: Parameters<typeof attachDocumentsToPaymentRequestMutationImpl>
): ReturnType<typeof attachDocumentsToPaymentRequestMutationImpl> {
  return attachDocumentsToPaymentRequestMutationImpl(...args);
}

export async function getDraftPaymentRequestsAction(
  ...args: Parameters<typeof getDraftPaymentRequestsActionImpl>
): ReturnType<typeof getDraftPaymentRequestsActionImpl> {
  return getDraftPaymentRequestsActionImpl(...args);
}

export async function attachDocumentToDraftPaymentRequestsMutation(
  ...args: Parameters<typeof attachDocumentToDraftPaymentRequestsMutationImpl>
): ReturnType<typeof attachDocumentToDraftPaymentRequestsMutationImpl> {
  return attachDocumentToDraftPaymentRequestsMutationImpl(...args);
}

export async function detachDocumentFromPaymentRequestMutation(
  ...args: Parameters<typeof detachDocumentFromPaymentRequestMutationImpl>
): ReturnType<typeof detachDocumentFromPaymentRequestMutationImpl> {
  return detachDocumentFromPaymentRequestMutationImpl(...args);
}

export async function payWithSavedMethodMutation(
  ...args: Parameters<typeof payWithSavedMethodMutationImpl>
): ReturnType<typeof payWithSavedMethodMutationImpl> {
  return payWithSavedMethodMutationImpl(...args);
}

export async function createPaymentCheckoutSessionMutation(
  ...args: Parameters<typeof createPaymentCheckoutSessionMutationImpl>
): ReturnType<typeof createPaymentCheckoutSessionMutationImpl> {
  return createPaymentCheckoutSessionMutationImpl(...args);
}

export async function generateInvoiceMutation(
  ...args: Parameters<typeof generateInvoiceMutationImpl>
): ReturnType<typeof generateInvoiceMutationImpl> {
  return generateInvoiceMutationImpl(...args);
}

export async function startVerificationSessionMutation(
  ...args: Parameters<typeof startVerificationSessionMutationImpl>
): ReturnType<typeof startVerificationSessionMutationImpl> {
  return startVerificationSessionMutationImpl(...args);
}

export async function submitWithdrawAction(
  ...args: Parameters<typeof submitWithdrawActionImpl>
): ReturnType<typeof submitWithdrawActionImpl> {
  return submitWithdrawActionImpl(...args);
}

export async function submitTransferAction(
  ...args: Parameters<typeof submitTransferActionImpl>
): ReturnType<typeof submitTransferActionImpl> {
  return submitTransferActionImpl(...args);
}

export async function createContactMutation(
  ...args: Parameters<typeof createContactMutationImpl>
): ReturnType<typeof createContactMutationImpl> {
  return createContactMutationImpl(...args);
}

export async function hasSavedContactByEmailQuery(
  ...args: Parameters<typeof hasSavedContactByEmailQueryImpl>
): ReturnType<typeof hasSavedContactByEmailQueryImpl> {
  return hasSavedContactByEmailQueryImpl(...args);
}

export async function deleteContactMutation(
  ...args: Parameters<typeof deleteContactMutationImpl>
): ReturnType<typeof deleteContactMutationImpl> {
  return deleteContactMutationImpl(...args);
}

export async function updateContactMutation(
  ...args: Parameters<typeof updateContactMutationImpl>
): ReturnType<typeof updateContactMutationImpl> {
  return updateContactMutationImpl(...args);
}

export async function updateProfileMutation(
  ...args: Parameters<typeof updateProfileMutationImpl>
): ReturnType<typeof updateProfileMutationImpl> {
  return updateProfileMutationImpl(...args);
}

export async function updateSettingsMutation(
  ...args: Parameters<typeof updateSettingsMutationImpl>
): ReturnType<typeof updateSettingsMutationImpl> {
  return updateSettingsMutationImpl(...args);
}

export async function changePasswordMutation(
  ...args: Parameters<typeof changePasswordMutationImpl>
): ReturnType<typeof changePasswordMutationImpl> {
  return changePasswordMutationImpl(...args);
}

export async function deleteDocumentMutation(
  ...args: Parameters<typeof deleteDocumentMutationImpl>
): ReturnType<typeof deleteDocumentMutationImpl> {
  return deleteDocumentMutationImpl(...args);
}

export async function bulkDeleteDocumentsMutation(
  ...args: Parameters<typeof bulkDeleteDocumentsMutationImpl>
): ReturnType<typeof bulkDeleteDocumentsMutationImpl> {
  return bulkDeleteDocumentsMutationImpl(...args);
}

export async function updateDocumentTagsMutation(
  ...args: Parameters<typeof updateDocumentTagsMutationImpl>
): ReturnType<typeof updateDocumentTagsMutationImpl> {
  return updateDocumentTagsMutationImpl(...args);
}

export async function addBankAccountMutation(
  ...args: Parameters<typeof addBankAccountMutationImpl>
): ReturnType<typeof addBankAccountMutationImpl> {
  return addBankAccountMutationImpl(...args);
}

export async function createReusableCardSetupIntentMutation(
  ...args: Parameters<typeof createReusableCardSetupIntentMutationImpl>
): ReturnType<typeof createReusableCardSetupIntentMutationImpl> {
  return createReusableCardSetupIntentMutationImpl(...args);
}

export async function confirmReusableCardSetupIntentMutation(
  ...args: Parameters<typeof confirmReusableCardSetupIntentMutationImpl>
): ReturnType<typeof confirmReusableCardSetupIntentMutationImpl> {
  return confirmReusableCardSetupIntentMutationImpl(...args);
}

export async function addCardMutation(
  ...args: Parameters<typeof addCardMutationImpl>
): ReturnType<typeof addCardMutationImpl> {
  return addCardMutationImpl(...args);
}

export async function setDefaultPaymentMethodMutation(
  ...args: Parameters<typeof setDefaultPaymentMethodMutationImpl>
): ReturnType<typeof setDefaultPaymentMethodMutationImpl> {
  return setDefaultPaymentMethodMutationImpl(...args);
}

export async function deletePaymentMethodMutation(
  ...args: Parameters<typeof deletePaymentMethodMutationImpl>
): ReturnType<typeof deletePaymentMethodMutationImpl> {
  return deletePaymentMethodMutationImpl(...args);
}

export async function getExchangeQuoteMutation(
  ...args: Parameters<typeof getExchangeQuoteMutationImpl>
): ReturnType<typeof getExchangeQuoteMutationImpl> {
  return getExchangeQuoteMutationImpl(...args);
}

export async function refreshExchangeRatesMutation(
  ...args: Parameters<typeof refreshExchangeRatesMutationImpl>
): ReturnType<typeof refreshExchangeRatesMutationImpl> {
  return refreshExchangeRatesMutationImpl(...args);
}

export async function convertExchangeMutation(
  ...args: Parameters<typeof convertExchangeMutationImpl>
): ReturnType<typeof convertExchangeMutationImpl> {
  return convertExchangeMutationImpl(...args);
}

export async function createExchangeRuleMutation(
  ...args: Parameters<typeof createExchangeRuleMutationImpl>
): ReturnType<typeof createExchangeRuleMutationImpl> {
  return createExchangeRuleMutationImpl(...args);
}

export async function updateExchangeRuleMutation(
  ...args: Parameters<typeof updateExchangeRuleMutationImpl>
): ReturnType<typeof updateExchangeRuleMutationImpl> {
  return updateExchangeRuleMutationImpl(...args);
}

export async function deleteExchangeRuleMutation(
  ...args: Parameters<typeof deleteExchangeRuleMutationImpl>
): ReturnType<typeof deleteExchangeRuleMutationImpl> {
  return deleteExchangeRuleMutationImpl(...args);
}

export async function scheduleExchangeMutation(
  ...args: Parameters<typeof scheduleExchangeMutationImpl>
): ReturnType<typeof scheduleExchangeMutationImpl> {
  return scheduleExchangeMutationImpl(...args);
}

export async function cancelScheduledExchangeMutation(
  ...args: Parameters<typeof cancelScheduledExchangeMutationImpl>
): ReturnType<typeof cancelScheduledExchangeMutationImpl> {
  return cancelScheduledExchangeMutationImpl(...args);
}
