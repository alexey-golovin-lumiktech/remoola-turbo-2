import { type Prisma } from '@remoola/database-2';

import { normalizeConsumerFacingTransactionStatus } from '../../../../shared/consumer-status-compat';
import {
  getEffectiveLedgerStatusOrNull,
  getEffectivePaymentRequestStatus,
} from '../../../../shared/transaction-status.utils';

export const buildConsumerPaymentListInclude = (consumerId: string) =>
  ({
    requester: true,
    payer: true,
    ledgerEntries: {
      where: { consumerId },
      orderBy: { createdAt: `desc` as const },
      take: 1,
      include: {
        outcomes: {
          orderBy: { createdAt: `desc` as const },
          take: 1,
          select: { status: true },
        },
      },
    },
  }) satisfies Prisma.PaymentRequestModelInclude;

type ConsumerPaymentListRow = Prisma.PaymentRequestModelGetPayload<{
  include: ReturnType<typeof buildConsumerPaymentListInclude>;
}>;

export function mapToConsumerPaymentListItem(
  paymentRequest: ConsumerPaymentListRow,
  consumerId: string,
  normalizedConsumerEmail: string | null,
) {
  const latestTx =
    paymentRequest.ledgerEntries.find((entry) => entry.consumerId === consumerId) ?? paymentRequest.ledgerEntries[0];
  const latestTxStatus = getEffectiveLedgerStatusOrNull(latestTx);
  const effectivePaymentStatus = getEffectivePaymentRequestStatus(paymentRequest.status, latestTx);
  const paymentRole =
    paymentRequest.payerId === consumerId ||
    (!paymentRequest.payerId &&
      normalizedConsumerEmail !== null &&
      paymentRequest.payerEmail?.trim().toLowerCase() === normalizedConsumerEmail)
      ? `PAYER`
      : `REQUESTER`;

  const counterparty = paymentRole === `PAYER` ? paymentRequest.requester : paymentRequest.payer;
  const counterpartyEmail =
    paymentRole === `PAYER`
      ? (paymentRequest.requester?.email ?? paymentRequest.requesterEmail ?? ``)
      : (paymentRequest.payer?.email ?? paymentRequest.payerEmail ?? ``);

  const latestTransaction =
    latestTx && latestTxStatus
      ? {
          id: latestTx.id,
          status: normalizeConsumerFacingTransactionStatus(latestTxStatus),
          createdAt: latestTx.createdAt.toISOString(),
        }
      : undefined;

  return {
    id: paymentRequest.id,
    amount: Number(paymentRequest.amount),
    currencyCode: paymentRequest.currencyCode,
    status: normalizeConsumerFacingTransactionStatus(effectivePaymentStatus),
    role: paymentRole,
    type: paymentRequest.type,
    description: paymentRequest.description,
    createdAt: paymentRequest.createdAt.toISOString(),
    counterparty: {
      id: counterparty?.id ?? ``,
      email: counterpartyEmail,
    },
    latestTransaction,
  };
}
