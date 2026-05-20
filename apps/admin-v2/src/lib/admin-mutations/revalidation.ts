import { revalidatePath } from 'next/cache';

import { SAVED_VIEW_WORKSPACE_PATHS } from '../admin-surface-meta';

export function revalidatePaymentPaths(paymentRequestId: string, consumerIds: (string | null)[]) {
  revalidatePath(`/payments`);
  revalidatePath(`/payments/${paymentRequestId}`);
  const seen = new Set<string>();
  for (const id of consumerIds) {
    if (id && !seen.has(id)) {
      revalidatePath(`/consumers/${id}`);
      seen.add(id);
    }
  }
}

export function revalidatePaymentMethodPaths(paymentMethodId: string, consumerId: string | null) {
  revalidatePath(`/payment-methods`);
  revalidatePath(`/payment-methods/${paymentMethodId}`);
  if (consumerId) {
    revalidatePath(`/consumers/${consumerId}`);
  }
}

export function revalidatePayoutPaths(payoutId: string, consumerId: string | null) {
  revalidatePath(`/payouts`);
  revalidatePath(`/payouts/${payoutId}`);
  if (consumerId) {
    revalidatePath(`/consumers/${consumerId}`);
  }
}

export function revalidateExchangeRatePaths(rateId: string) {
  revalidatePath(`/exchange`);
  revalidatePath(`/exchange/rates`);
  revalidatePath(`/exchange/rates/${rateId}`);
  revalidatePath(`/overview`);
}

export function revalidateExchangeRulePaths(ruleId: string, consumerId: string | null) {
  revalidatePath(`/exchange`);
  revalidatePath(`/exchange/rules`);
  revalidatePath(`/exchange/rules/${ruleId}`);
  revalidatePath(`/overview`);
  if (consumerId) {
    revalidatePath(`/consumers/${consumerId}`);
  }
}

export function revalidateExchangeScheduledPaths(conversionId: string, consumerId: string | null) {
  revalidatePath(`/exchange`);
  revalidatePath(`/exchange/scheduled`);
  revalidatePath(`/exchange/scheduled/${conversionId}`);
  revalidatePath(`/overview`);
  if (consumerId) {
    revalidatePath(`/consumers/${consumerId}`);
  }
}

export function revalidateDocumentsPaths(documentId?: string | null) {
  revalidatePath(`/documents`);
  revalidatePath(`/documents/tags`);
  if (documentId?.trim()) {
    revalidatePath(`/documents/${documentId.trim()}`);
  }
}

export function revalidateAdminPaths(adminId?: string | null) {
  revalidatePath(`/admins`);
  if (adminId?.trim()) {
    revalidatePath(`/admins/${adminId.trim()}`);
  }
}

export function revalidateVerificationAssignmentPaths(consumerId: string) {
  revalidatePath(`/verification`);
  revalidatePath(`/verification/${consumerId}`);
}

export function revalidateLedgerEntryAssignmentPaths(ledgerEntryId: string) {
  revalidatePath(`/ledger`);
  revalidatePath(`/ledger/anomalies`);
  revalidatePath(`/ledger/${ledgerEntryId}`);
}

export function revalidatePaymentRequestAssignmentPaths(paymentRequestId: string) {
  revalidatePath(`/payments`);
  revalidatePath(`/payments/operations`);
  revalidatePath(`/payments/${paymentRequestId}`);
}

export function revalidatePayoutAssignmentPaths(payoutId: string) {
  revalidatePath(`/payouts`);
  revalidatePath(`/payouts/${payoutId}`);
}

export function revalidateDocumentAssignmentPaths(documentId: string) {
  revalidatePath(`/documents`);
  revalidatePath(`/documents/${documentId}`);
}

export function revalidateFxConversionAssignmentPaths(conversionId: string) {
  revalidatePath(`/exchange/scheduled`);
  revalidatePath(`/exchange/scheduled/${conversionId}`);
}

export function revalidateSavedViewWorkspace(workspace: string) {
  const path = SAVED_VIEW_WORKSPACE_PATHS[workspace as keyof typeof SAVED_VIEW_WORKSPACE_PATHS];
  if (path) {
    revalidatePath(path);
  }
}

export const OPERATIONAL_ALERTS_PATH = `/system/alerts`;

export function revalidateOperationalAlerts() {
  revalidatePath(OPERATIONAL_ALERTS_PATH);
}
