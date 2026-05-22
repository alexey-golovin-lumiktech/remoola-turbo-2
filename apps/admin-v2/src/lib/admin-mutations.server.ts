'use server';

import {
  inviteAdminAction as inviteAdminActionImpl,
  deactivateAdminAction as deactivateAdminActionImpl,
  restoreAdminAction as restoreAdminActionImpl,
  changeAdminRoleAction as changeAdminRoleActionImpl,
  changeAdminPermissionsAction as changeAdminPermissionsActionImpl,
  resetAdminPasswordAction as resetAdminPasswordActionImpl,
  revokeMyAdminSessionAction as revokeMyAdminSessionActionImpl,
  revokeAdminSessionAction as revokeAdminSessionActionImpl,
} from './admin-mutations/admins.server';
import {
  createConsumerNoteAction as createConsumerNoteActionImpl,
  addConsumerFlagAction as addConsumerFlagActionImpl,
  removeConsumerFlagAction as removeConsumerFlagActionImpl,
  forceLogoutConsumerAction as forceLogoutConsumerActionImpl,
  suspendConsumerAction as suspendConsumerActionImpl,
  resendConsumerEmailAction as resendConsumerEmailActionImpl,
} from './admin-mutations/consumers.server';
import {
  createDocumentTagAction as createDocumentTagActionImpl,
  updateDocumentTagAction as updateDocumentTagActionImpl,
  deleteDocumentTagAction as deleteDocumentTagActionImpl,
  retagDocumentAction as retagDocumentActionImpl,
  bulkTagDocumentsAction as bulkTagDocumentsActionImpl,
  claimDocumentAssignmentAction as claimDocumentAssignmentActionImpl,
  releaseDocumentAssignmentAction as releaseDocumentAssignmentActionImpl,
  reassignDocumentAssignmentAction as reassignDocumentAssignmentActionImpl,
} from './admin-mutations/documents.server';
import {
  approveExchangeRateAction as approveExchangeRateActionImpl,
  pauseExchangeRuleAction as pauseExchangeRuleActionImpl,
  resumeExchangeRuleAction as resumeExchangeRuleActionImpl,
  runExchangeRuleNowAction as runExchangeRuleNowActionImpl,
  forceExecuteScheduledExchangeAction as forceExecuteScheduledExchangeActionImpl,
  cancelScheduledExchangeAction as cancelScheduledExchangeActionImpl,
  claimFxConversionAssignmentAction as claimFxConversionAssignmentActionImpl,
  releaseFxConversionAssignmentAction as releaseFxConversionAssignmentActionImpl,
  reassignFxConversionAssignmentAction as reassignFxConversionAssignmentActionImpl,
} from './admin-mutations/exchange.server';
import {
  claimLedgerEntryAssignmentAction as claimLedgerEntryAssignmentActionImpl,
  releaseLedgerEntryAssignmentAction as releaseLedgerEntryAssignmentActionImpl,
  reassignLedgerEntryAssignmentAction as reassignLedgerEntryAssignmentActionImpl,
} from './admin-mutations/ledger.server';
import {
  createOperationalAlertAction as createOperationalAlertActionImpl,
  updateOperationalAlertAction as updateOperationalAlertActionImpl,
  deleteOperationalAlertAction as deleteOperationalAlertActionImpl,
} from './admin-mutations/operational-alerts.server';
import {
  disablePaymentMethodAction as disablePaymentMethodActionImpl,
  removeDefaultPaymentMethodAction as removeDefaultPaymentMethodActionImpl,
  escalateDuplicatePaymentMethodAction as escalateDuplicatePaymentMethodActionImpl,
} from './admin-mutations/payment-methods.server';
import {
  refundPaymentAction as refundPaymentActionImpl,
  chargebackPaymentAction as chargebackPaymentActionImpl,
  claimPaymentRequestAssignmentAction as claimPaymentRequestAssignmentActionImpl,
  releasePaymentRequestAssignmentAction as releasePaymentRequestAssignmentActionImpl,
  reassignPaymentRequestAssignmentAction as reassignPaymentRequestAssignmentActionImpl,
} from './admin-mutations/payments.server';
import {
  escalatePayoutAction as escalatePayoutActionImpl,
  claimPayoutAssignmentAction as claimPayoutAssignmentActionImpl,
  releasePayoutAssignmentAction as releasePayoutAssignmentActionImpl,
  reassignPayoutAssignmentAction as reassignPayoutAssignmentActionImpl,
} from './admin-mutations/payouts.server';
import {
  createSavedViewAction as createSavedViewActionImpl,
  updateSavedViewAction as updateSavedViewActionImpl,
  deleteSavedViewAction as deleteSavedViewActionImpl,
} from './admin-mutations/saved-views.server';
import {
  approveVerificationAction as approveVerificationActionImpl,
  rejectVerificationAction as rejectVerificationActionImpl,
  requestInfoVerificationAction as requestInfoVerificationActionImpl,
  flagVerificationAction as flagVerificationActionImpl,
  claimVerificationAssignmentAction as claimVerificationAssignmentActionImpl,
  releaseVerificationAssignmentAction as releaseVerificationAssignmentActionImpl,
  reassignVerificationAssignmentAction as reassignVerificationAssignmentActionImpl,
} from './admin-mutations/verification.server';

export async function createConsumerNoteAction(
  ...args: Parameters<typeof createConsumerNoteActionImpl>
): ReturnType<typeof createConsumerNoteActionImpl> {
  return createConsumerNoteActionImpl(...args);
}

export async function addConsumerFlagAction(
  ...args: Parameters<typeof addConsumerFlagActionImpl>
): ReturnType<typeof addConsumerFlagActionImpl> {
  return addConsumerFlagActionImpl(...args);
}

export async function removeConsumerFlagAction(
  ...args: Parameters<typeof removeConsumerFlagActionImpl>
): ReturnType<typeof removeConsumerFlagActionImpl> {
  return removeConsumerFlagActionImpl(...args);
}

export async function forceLogoutConsumerAction(
  ...args: Parameters<typeof forceLogoutConsumerActionImpl>
): ReturnType<typeof forceLogoutConsumerActionImpl> {
  return forceLogoutConsumerActionImpl(...args);
}

export async function suspendConsumerAction(
  ...args: Parameters<typeof suspendConsumerActionImpl>
): ReturnType<typeof suspendConsumerActionImpl> {
  return suspendConsumerActionImpl(...args);
}

export async function resendConsumerEmailAction(
  ...args: Parameters<typeof resendConsumerEmailActionImpl>
): ReturnType<typeof resendConsumerEmailActionImpl> {
  return resendConsumerEmailActionImpl(...args);
}

export async function disablePaymentMethodAction(
  ...args: Parameters<typeof disablePaymentMethodActionImpl>
): ReturnType<typeof disablePaymentMethodActionImpl> {
  return disablePaymentMethodActionImpl(...args);
}

export async function removeDefaultPaymentMethodAction(
  ...args: Parameters<typeof removeDefaultPaymentMethodActionImpl>
): ReturnType<typeof removeDefaultPaymentMethodActionImpl> {
  return removeDefaultPaymentMethodActionImpl(...args);
}

export async function escalateDuplicatePaymentMethodAction(
  ...args: Parameters<typeof escalateDuplicatePaymentMethodActionImpl>
): ReturnType<typeof escalateDuplicatePaymentMethodActionImpl> {
  return escalateDuplicatePaymentMethodActionImpl(...args);
}

export async function refundPaymentAction(
  ...args: Parameters<typeof refundPaymentActionImpl>
): ReturnType<typeof refundPaymentActionImpl> {
  return refundPaymentActionImpl(...args);
}

export async function chargebackPaymentAction(
  ...args: Parameters<typeof chargebackPaymentActionImpl>
): ReturnType<typeof chargebackPaymentActionImpl> {
  return chargebackPaymentActionImpl(...args);
}

export async function claimPaymentRequestAssignmentAction(
  ...args: Parameters<typeof claimPaymentRequestAssignmentActionImpl>
): ReturnType<typeof claimPaymentRequestAssignmentActionImpl> {
  return claimPaymentRequestAssignmentActionImpl(...args);
}

export async function releasePaymentRequestAssignmentAction(
  ...args: Parameters<typeof releasePaymentRequestAssignmentActionImpl>
): ReturnType<typeof releasePaymentRequestAssignmentActionImpl> {
  return releasePaymentRequestAssignmentActionImpl(...args);
}

export async function reassignPaymentRequestAssignmentAction(
  ...args: Parameters<typeof reassignPaymentRequestAssignmentActionImpl>
): ReturnType<typeof reassignPaymentRequestAssignmentActionImpl> {
  return reassignPaymentRequestAssignmentActionImpl(...args);
}

export async function escalatePayoutAction(
  ...args: Parameters<typeof escalatePayoutActionImpl>
): ReturnType<typeof escalatePayoutActionImpl> {
  return escalatePayoutActionImpl(...args);
}

export async function claimPayoutAssignmentAction(
  ...args: Parameters<typeof claimPayoutAssignmentActionImpl>
): ReturnType<typeof claimPayoutAssignmentActionImpl> {
  return claimPayoutAssignmentActionImpl(...args);
}

export async function releasePayoutAssignmentAction(
  ...args: Parameters<typeof releasePayoutAssignmentActionImpl>
): ReturnType<typeof releasePayoutAssignmentActionImpl> {
  return releasePayoutAssignmentActionImpl(...args);
}

export async function reassignPayoutAssignmentAction(
  ...args: Parameters<typeof reassignPayoutAssignmentActionImpl>
): ReturnType<typeof reassignPayoutAssignmentActionImpl> {
  return reassignPayoutAssignmentActionImpl(...args);
}

export async function approveExchangeRateAction(
  ...args: Parameters<typeof approveExchangeRateActionImpl>
): ReturnType<typeof approveExchangeRateActionImpl> {
  return approveExchangeRateActionImpl(...args);
}

export async function pauseExchangeRuleAction(
  ...args: Parameters<typeof pauseExchangeRuleActionImpl>
): ReturnType<typeof pauseExchangeRuleActionImpl> {
  return pauseExchangeRuleActionImpl(...args);
}

export async function resumeExchangeRuleAction(
  ...args: Parameters<typeof resumeExchangeRuleActionImpl>
): ReturnType<typeof resumeExchangeRuleActionImpl> {
  return resumeExchangeRuleActionImpl(...args);
}

export async function runExchangeRuleNowAction(
  ...args: Parameters<typeof runExchangeRuleNowActionImpl>
): ReturnType<typeof runExchangeRuleNowActionImpl> {
  return runExchangeRuleNowActionImpl(...args);
}

export async function forceExecuteScheduledExchangeAction(
  ...args: Parameters<typeof forceExecuteScheduledExchangeActionImpl>
): ReturnType<typeof forceExecuteScheduledExchangeActionImpl> {
  return forceExecuteScheduledExchangeActionImpl(...args);
}

export async function cancelScheduledExchangeAction(
  ...args: Parameters<typeof cancelScheduledExchangeActionImpl>
): ReturnType<typeof cancelScheduledExchangeActionImpl> {
  return cancelScheduledExchangeActionImpl(...args);
}

export async function claimFxConversionAssignmentAction(
  ...args: Parameters<typeof claimFxConversionAssignmentActionImpl>
): ReturnType<typeof claimFxConversionAssignmentActionImpl> {
  return claimFxConversionAssignmentActionImpl(...args);
}

export async function releaseFxConversionAssignmentAction(
  ...args: Parameters<typeof releaseFxConversionAssignmentActionImpl>
): ReturnType<typeof releaseFxConversionAssignmentActionImpl> {
  return releaseFxConversionAssignmentActionImpl(...args);
}

export async function reassignFxConversionAssignmentAction(
  ...args: Parameters<typeof reassignFxConversionAssignmentActionImpl>
): ReturnType<typeof reassignFxConversionAssignmentActionImpl> {
  return reassignFxConversionAssignmentActionImpl(...args);
}

export async function createDocumentTagAction(
  ...args: Parameters<typeof createDocumentTagActionImpl>
): ReturnType<typeof createDocumentTagActionImpl> {
  return createDocumentTagActionImpl(...args);
}

export async function updateDocumentTagAction(
  ...args: Parameters<typeof updateDocumentTagActionImpl>
): ReturnType<typeof updateDocumentTagActionImpl> {
  return updateDocumentTagActionImpl(...args);
}

export async function deleteDocumentTagAction(
  ...args: Parameters<typeof deleteDocumentTagActionImpl>
): ReturnType<typeof deleteDocumentTagActionImpl> {
  return deleteDocumentTagActionImpl(...args);
}

export async function retagDocumentAction(
  ...args: Parameters<typeof retagDocumentActionImpl>
): ReturnType<typeof retagDocumentActionImpl> {
  return retagDocumentActionImpl(...args);
}

export async function bulkTagDocumentsAction(
  ...args: Parameters<typeof bulkTagDocumentsActionImpl>
): ReturnType<typeof bulkTagDocumentsActionImpl> {
  return bulkTagDocumentsActionImpl(...args);
}

export async function claimDocumentAssignmentAction(
  ...args: Parameters<typeof claimDocumentAssignmentActionImpl>
): ReturnType<typeof claimDocumentAssignmentActionImpl> {
  return claimDocumentAssignmentActionImpl(...args);
}

export async function releaseDocumentAssignmentAction(
  ...args: Parameters<typeof releaseDocumentAssignmentActionImpl>
): ReturnType<typeof releaseDocumentAssignmentActionImpl> {
  return releaseDocumentAssignmentActionImpl(...args);
}

export async function reassignDocumentAssignmentAction(
  ...args: Parameters<typeof reassignDocumentAssignmentActionImpl>
): ReturnType<typeof reassignDocumentAssignmentActionImpl> {
  return reassignDocumentAssignmentActionImpl(...args);
}

export async function claimLedgerEntryAssignmentAction(
  ...args: Parameters<typeof claimLedgerEntryAssignmentActionImpl>
): ReturnType<typeof claimLedgerEntryAssignmentActionImpl> {
  return claimLedgerEntryAssignmentActionImpl(...args);
}

export async function releaseLedgerEntryAssignmentAction(
  ...args: Parameters<typeof releaseLedgerEntryAssignmentActionImpl>
): ReturnType<typeof releaseLedgerEntryAssignmentActionImpl> {
  return releaseLedgerEntryAssignmentActionImpl(...args);
}

export async function reassignLedgerEntryAssignmentAction(
  ...args: Parameters<typeof reassignLedgerEntryAssignmentActionImpl>
): ReturnType<typeof reassignLedgerEntryAssignmentActionImpl> {
  return reassignLedgerEntryAssignmentActionImpl(...args);
}

export async function approveVerificationAction(
  ...args: Parameters<typeof approveVerificationActionImpl>
): ReturnType<typeof approveVerificationActionImpl> {
  return approveVerificationActionImpl(...args);
}

export async function rejectVerificationAction(
  ...args: Parameters<typeof rejectVerificationActionImpl>
): ReturnType<typeof rejectVerificationActionImpl> {
  return rejectVerificationActionImpl(...args);
}

export async function requestInfoVerificationAction(
  ...args: Parameters<typeof requestInfoVerificationActionImpl>
): ReturnType<typeof requestInfoVerificationActionImpl> {
  return requestInfoVerificationActionImpl(...args);
}

export async function flagVerificationAction(
  ...args: Parameters<typeof flagVerificationActionImpl>
): ReturnType<typeof flagVerificationActionImpl> {
  return flagVerificationActionImpl(...args);
}

export async function claimVerificationAssignmentAction(
  ...args: Parameters<typeof claimVerificationAssignmentActionImpl>
): ReturnType<typeof claimVerificationAssignmentActionImpl> {
  return claimVerificationAssignmentActionImpl(...args);
}

export async function releaseVerificationAssignmentAction(
  ...args: Parameters<typeof releaseVerificationAssignmentActionImpl>
): ReturnType<typeof releaseVerificationAssignmentActionImpl> {
  return releaseVerificationAssignmentActionImpl(...args);
}

export async function reassignVerificationAssignmentAction(
  ...args: Parameters<typeof reassignVerificationAssignmentActionImpl>
): ReturnType<typeof reassignVerificationAssignmentActionImpl> {
  return reassignVerificationAssignmentActionImpl(...args);
}

export async function inviteAdminAction(
  ...args: Parameters<typeof inviteAdminActionImpl>
): ReturnType<typeof inviteAdminActionImpl> {
  return inviteAdminActionImpl(...args);
}

export async function deactivateAdminAction(
  ...args: Parameters<typeof deactivateAdminActionImpl>
): ReturnType<typeof deactivateAdminActionImpl> {
  return deactivateAdminActionImpl(...args);
}

export async function restoreAdminAction(
  ...args: Parameters<typeof restoreAdminActionImpl>
): ReturnType<typeof restoreAdminActionImpl> {
  return restoreAdminActionImpl(...args);
}

export async function changeAdminRoleAction(
  ...args: Parameters<typeof changeAdminRoleActionImpl>
): ReturnType<typeof changeAdminRoleActionImpl> {
  return changeAdminRoleActionImpl(...args);
}

export async function changeAdminPermissionsAction(
  ...args: Parameters<typeof changeAdminPermissionsActionImpl>
): ReturnType<typeof changeAdminPermissionsActionImpl> {
  return changeAdminPermissionsActionImpl(...args);
}

export async function resetAdminPasswordAction(
  ...args: Parameters<typeof resetAdminPasswordActionImpl>
): ReturnType<typeof resetAdminPasswordActionImpl> {
  return resetAdminPasswordActionImpl(...args);
}

export async function revokeMyAdminSessionAction(
  ...args: Parameters<typeof revokeMyAdminSessionActionImpl>
): ReturnType<typeof revokeMyAdminSessionActionImpl> {
  return revokeMyAdminSessionActionImpl(...args);
}

export async function revokeAdminSessionAction(
  ...args: Parameters<typeof revokeAdminSessionActionImpl>
): ReturnType<typeof revokeAdminSessionActionImpl> {
  return revokeAdminSessionActionImpl(...args);
}

export async function createSavedViewAction(
  ...args: Parameters<typeof createSavedViewActionImpl>
): ReturnType<typeof createSavedViewActionImpl> {
  return createSavedViewActionImpl(...args);
}

export async function updateSavedViewAction(
  ...args: Parameters<typeof updateSavedViewActionImpl>
): ReturnType<typeof updateSavedViewActionImpl> {
  return updateSavedViewActionImpl(...args);
}

export async function deleteSavedViewAction(
  ...args: Parameters<typeof deleteSavedViewActionImpl>
): ReturnType<typeof deleteSavedViewActionImpl> {
  return deleteSavedViewActionImpl(...args);
}

export async function createOperationalAlertAction(
  ...args: Parameters<typeof createOperationalAlertActionImpl>
): ReturnType<typeof createOperationalAlertActionImpl> {
  return createOperationalAlertActionImpl(...args);
}

export async function updateOperationalAlertAction(
  ...args: Parameters<typeof updateOperationalAlertActionImpl>
): ReturnType<typeof updateOperationalAlertActionImpl> {
  return updateOperationalAlertActionImpl(...args);
}

export async function deleteOperationalAlertAction(
  ...args: Parameters<typeof deleteOperationalAlertActionImpl>
): ReturnType<typeof deleteOperationalAlertActionImpl> {
  return deleteOperationalAlertActionImpl(...args);
}
