import { buildPaymentDetailHref } from '../payments/payment-flow-context';

export type DocumentItem = {
  id: string;
  name: string;
  kind: string;
  createdAt: string;
  size: number;
  downloadUrl: string;
  tags: string[];
  isAttachedToDraftPaymentRequest: boolean;
  attachedDraftPaymentRequestIds: string[];
  isAttachedToNonDraftPaymentRequest: boolean;
  attachedNonDraftPaymentRequestIds: string[];
};

export type DocumentContractContext = {
  id: string;
  returnTo: string;
} | null;

export function formatDate(value: string) {
  return new Date(value).toLocaleDateString(`en-US`, {
    year: `numeric`,
    month: `short`,
    day: `2-digit`,
  });
}

export function formatFileSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

export function isDeleteBlocked(document: DocumentItem) {
  return document.isAttachedToDraftPaymentRequest || document.isAttachedToNonDraftPaymentRequest;
}

export function getHistoricalRecordLabel(count: number) {
  return count === 1 ? `Attached to payment record` : `Attached to payment records`;
}

export function getDeleteBlockedMessage(documentIds: string[], documents: DocumentItem[]) {
  const selectedDocuments = documents.filter((document) => documentIds.indexOf(document.id) !== -1);
  const hasNonDraftAttachment = selectedDocuments.some((document) => document.isAttachedToNonDraftPaymentRequest);
  if (hasNonDraftAttachment) {
    return selectedDocuments.length === 1
      ? `This document is attached to a payment that is no longer a draft. It now remains part of that payment record, so it cannot be deleted from Documents.`
      : `Some selected documents are attached to payments that are no longer drafts. They now remain part of those payment records, so they cannot be deleted from Documents.`;
  }

  return selectedDocuments.length === 1
    ? `This document is still attached to a draft payment request. Open the draft and remove it there before deleting it from Documents.`
    : `Some selected documents are still attached to draft payment requests. Open each draft and remove them there before deleting them from Documents.`;
}

export function buildDocumentPaymentHref(paymentRequestId: string, contractContext?: DocumentContractContext) {
  if (!contractContext) {
    return `/payments/${paymentRequestId}`;
  }
  return buildPaymentDetailHref(paymentRequestId, {
    contractId: contractContext.id,
    returnTo: contractContext.returnTo,
  });
}
