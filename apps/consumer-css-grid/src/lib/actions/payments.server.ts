'use server';

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
} from '../mutations/payments.server';

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
