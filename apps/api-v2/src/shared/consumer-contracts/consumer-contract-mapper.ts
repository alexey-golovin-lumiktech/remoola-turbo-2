import { $Enums } from '@remoola/database-2';

import { buildConsumerDocumentDownloadUrl } from '../consumer-document-download-url';
import { normalizeConsumerFacingTransactionStatus } from '../consumer-status-compat';
import { getEffectivePaymentRequestStatus, type LedgerStatusCarrier } from '../transaction-status.utils';

const OPERATING_STATUS_PRIORITY = [`draft`, `pending`, `waiting`] as const;

type ContractPaymentRequest = {
  id: string;
  amount: { toString(): string };
  status: $Enums.TransactionStatus;
  createdAt: Date;
  updatedAt: Date;
  paymentRail: $Enums.PaymentRail | null;
  payer?: { email?: string | null } | null;
  payerEmail?: string | null;
  requester?: { email?: string | null } | null;
  requesterEmail?: string | null;
  ledgerEntries: Array<
    LedgerStatusCarrier & {
      consumerId?: string;
    }
  >;
};

type ContractListPaymentRequest = {
  id: string;
  status: $Enums.TransactionStatus;
  updatedAt: Date;
  ledgerEntries: Array<
    LedgerStatusCarrier & {
      consumerId?: string;
    }
  >;
};

type ContractDocumentPaymentRequest = {
  status: $Enums.TransactionStatus;
  id: string;
  attachments: Array<{
    resource: {
      id: string;
      originalName: string;
      createdAt: Date | null;
      resourceTags: Array<{ tag: { name: string } }>;
    };
  }>;
};

type ContractAttachmentPaymentRequest = {
  attachments: Array<{
    resourceId?: string | null;
    id?: string | null;
  }>;
};

export function normalizeEmail(value: string | null | undefined): string {
  return value?.trim().toLowerCase() ?? ``;
}

function sortContractPaymentsByUpdatedAt<T extends { updatedAt: Date }>(payments: T[]): T[] {
  return [...payments].sort((left, right) => right.updatedAt.getTime() - left.updatedAt.getTime());
}

export function getLatestRelationshipPayment<T extends { updatedAt: Date }>(payments: T[]): T | null {
  return sortContractPaymentsByUpdatedAt(payments)[0] ?? null;
}

export function getOperatingRelationshipPayment<T extends { status: string; updatedAt: Date }>(
  payments: T[],
): T | null {
  const orderedPayments = sortContractPaymentsByUpdatedAt(payments);
  for (const status of OPERATING_STATUS_PRIORITY) {
    const matchingPayment = orderedPayments.find((payment) => payment.status === status);
    if (matchingPayment) {
      return matchingPayment;
    }
  }
  return orderedPayments[0] ?? null;
}

export function mapContractPayment(consumerId: string, contractEmail: string, paymentRequest: ContractPaymentRequest) {
  const latestConsumerLedgerEntry = paymentRequest.ledgerEntries.find(
    (entry) => !entry.consumerId || entry.consumerId === consumerId,
  );
  const status = normalizeConsumerFacingTransactionStatus(
    getEffectivePaymentRequestStatus(paymentRequest.status, latestConsumerLedgerEntry),
  ).toLowerCase();
  const normalizedContractEmail = normalizeEmail(contractEmail);
  const payerEmail = normalizeEmail(paymentRequest.payer?.email ?? paymentRequest.payerEmail);
  const requesterEmail = normalizeEmail(paymentRequest.requester?.email ?? paymentRequest.requesterEmail);
  const role =
    payerEmail === normalizedContractEmail
      ? `REQUESTER`
      : requesterEmail === normalizedContractEmail
        ? `PAYER`
        : `REQUESTER`;

  return {
    id: paymentRequest.id,
    amount: paymentRequest.amount.toString(),
    status,
    createdAt: paymentRequest.createdAt,
    updatedAt: paymentRequest.updatedAt,
    role,
    paymentRail: paymentRequest.paymentRail,
  };
}

export function mapContractListPayment(consumerId: string, paymentRequest: ContractListPaymentRequest) {
  const latestConsumerLedgerEntry = paymentRequest.ledgerEntries.find(
    (entry) => !entry.consumerId || entry.consumerId === consumerId,
  );

  return {
    id: paymentRequest.id,
    status: normalizeConsumerFacingTransactionStatus(
      getEffectivePaymentRequestStatus(paymentRequest.status, latestConsumerLedgerEntry),
    ).toLowerCase(),
    updatedAt: paymentRequest.updatedAt,
  };
}

export function countUniqueAttachmentResources(paymentRequests: ContractAttachmentPaymentRequest[]): number {
  const resourceIds = new Set<string>();
  for (const paymentRequest of paymentRequests) {
    for (const attachment of paymentRequest.attachments) {
      const resourceId = attachment.resourceId?.trim() || attachment.id?.trim();
      if (resourceId) {
        resourceIds.add(resourceId);
      }
    }
  }
  return resourceIds.size;
}

export function buildContractDocuments(paymentRequests: ContractDocumentPaymentRequest[], backendBaseUrl?: string) {
  const byResource = new Map<
    string,
    {
      id: string;
      name: string;
      downloadUrl: string;
      createdAt: Date;
      tags: string[];
      attachedDraftPaymentRequestIds: string[];
      attachedNonDraftPaymentRequestIds: string[];
    }
  >();

  for (const paymentRequest of paymentRequests) {
    for (const attachment of paymentRequest.attachments) {
      const resource = attachment.resource;
      const current = byResource.get(resource.id);
      const nextDraftIds = new Set(current?.attachedDraftPaymentRequestIds ?? []);
      const nextNonDraftIds = new Set(current?.attachedNonDraftPaymentRequestIds ?? []);

      if (paymentRequest.status === $Enums.TransactionStatus.DRAFT) {
        nextDraftIds.add(paymentRequest.id);
      } else {
        nextNonDraftIds.add(paymentRequest.id);
      }

      byResource.set(resource.id, {
        id: resource.id,
        name: resource.originalName,
        downloadUrl: buildConsumerDocumentDownloadUrl(resource.id, backendBaseUrl),
        createdAt: resource.createdAt ?? current?.createdAt ?? new Date(0),
        tags: Array.from(new Set([...(current?.tags ?? []), ...resource.resourceTags.map((tag) => tag.tag.name)])),
        attachedDraftPaymentRequestIds: Array.from(nextDraftIds),
        attachedNonDraftPaymentRequestIds: Array.from(nextNonDraftIds),
      });
    }
  }

  return Array.from(byResource.values())
    .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
    .map((document) => ({
      ...document,
      isAttachedToDraftPaymentRequest: document.attachedDraftPaymentRequestIds.length > 0,
      isAttachedToNonDraftPaymentRequest: document.attachedNonDraftPaymentRequestIds.length > 0,
    }));
}
