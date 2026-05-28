import { PAYMENT_DIRECTION } from '@remoola/api-types';
import { $Enums, type Prisma } from '@remoola/database-2';

import { buildConsumerDocumentDownloadUrl } from '../../../../shared/consumer-document-download-url';
import { normalizeConsumerFacingTransactionStatus } from '../../../../shared/consumer-status-compat';
import { parseLedgerMetadata } from '../../../../shared/json-metadata.utils';
import {
  getEffectiveLedgerStatusOrNull,
  getEffectivePaymentRequestStatus,
} from '../../../../shared/transaction-status.utils';

export const consumerPaymentViewInclude = {
  payer: { select: { id: true, email: true } },
  requester: { select: { id: true, email: true } },
  attachments: {
    orderBy: { createdAt: `desc` as const },
    include: {
      resource: {
        include: {
          resourceTags: {
            include: { tag: true },
          },
        },
      },
    },
  },
  ledgerEntries: {
    orderBy: { createdAt: `asc` as const },
    include: {
      outcomes: {
        orderBy: { createdAt: `desc` as const },
        take: 1,
        select: { status: true },
      },
    },
  },
} satisfies Prisma.PaymentRequestModelInclude;

type ConsumerPaymentViewRow = Prisma.PaymentRequestModelGetPayload<{
  include: typeof consumerPaymentViewInclude;
}>;

function normalizeProductLedgerType(
  type: $Enums.LedgerEntryType,
  paymentRequestId: string | null | undefined,
): $Enums.LedgerEntryType {
  if (!paymentRequestId) return type;
  if (type === $Enums.LedgerEntryType.USER_DEPOSIT) return $Enums.LedgerEntryType.USER_PAYMENT;
  if (type === $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL) return $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL;
  return type;
}

function isInvoiceResource(resource: { resourceTags?: Array<{ tag: { name: string } }> } | null | undefined): boolean {
  return resource?.resourceTags?.some((resourceTag) => resourceTag.tag.name.startsWith(`INVOICE-`)) ?? false;
}

export function isEmailOnlyParticipant(
  participantId: string | null | undefined,
  participantEmail: string | null | undefined,
  consumerEmail: string | null,
): boolean {
  return (
    !participantId && !!participantEmail && !!consumerEmail && participantEmail.trim().toLowerCase() === consumerEmail
  );
}

export function mapToConsumerPaymentView(
  paymentRequest: ConsumerPaymentViewRow,
  consumerId: string,
  consumerEmail: string | null,
  backendBaseUrl?: string,
) {
  const consumerLedgerEntry =
    paymentRequest.ledgerEntries
      .filter((entry) => entry.consumerId === consumerId)
      .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())[0] ?? null;

  const isEmailOnlyPayer = isEmailOnlyParticipant(paymentRequest.payerId, paymentRequest.payerEmail, consumerEmail);
  const isPayer = paymentRequest.payerId === consumerId || isEmailOnlyPayer;

  return {
    id: paymentRequest.id,
    amount: Number(paymentRequest.amount),
    currencyCode: paymentRequest.currencyCode,
    status: normalizeConsumerFacingTransactionStatus(
      getEffectivePaymentRequestStatus(paymentRequest.status, consumerLedgerEntry),
    ),
    description: paymentRequest.description,
    dueDate: paymentRequest.dueDate?.toISOString() ?? null,
    sentDate: paymentRequest.sentDate?.toISOString() ?? null,
    createdAt: paymentRequest.createdAt.toISOString(),
    updatedAt: paymentRequest.updatedAt.toISOString(),
    role: isPayer ? `PAYER` : `REQUESTER`,
    payer: paymentRequest.payer ?? { id: null, email: paymentRequest.payerEmail ?? null },
    requester: paymentRequest.requester ?? { id: null, email: paymentRequest.requesterEmail ?? null },
    ledgerEntries: paymentRequest.ledgerEntries
      .filter((entry) => entry.consumerId === consumerId)
      .map((entry) => {
        const metadata = parseLedgerMetadata(entry.metadata);
        const amount = Number(entry.amount);

        return {
          id: entry.id,
          ledgerId: entry.ledgerId,
          currencyCode: entry.currencyCode,
          amount,
          direction: amount > 0 ? PAYMENT_DIRECTION.INCOME : PAYMENT_DIRECTION.OUTCOME,
          status: normalizeConsumerFacingTransactionStatus(getEffectiveLedgerStatusOrNull(entry)!),
          type: normalizeProductLedgerType(entry.type, entry.paymentRequestId),
          createdAt: entry.createdAt.toISOString(),
          rail: metadata.rail ?? paymentRequest.paymentRail ?? null,
          counterpartyId: metadata.counterpartyId,
        };
      })
      .filter(
        (entry, index, self) =>
          index ===
          self.findIndex((candidate) => candidate.ledgerId === entry.ledgerId && candidate.type === entry.type),
      ),
    attachments: paymentRequest.attachments
      .filter((attachment) => !isInvoiceResource(attachment.resource) || attachment.requesterId === consumerId)
      .map((attachment) => ({
        id: attachment.resource.id,
        name: attachment.resource.originalName,
        downloadUrl: buildConsumerDocumentDownloadUrl(attachment.resource.id, backendBaseUrl),
        size: attachment.resource.size,
        createdAt: attachment.resource.createdAt.toISOString(),
      })),
  };
}
