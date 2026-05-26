import { Injectable, Logger } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { newUuid } from '@remoola/security-utils';

import {
  buildStripeReversalLedgerIdempotencyKeys,
  calculateAlreadyReversedAmount,
  capExternalReversalAmount,
  getRequesterReversalEntryType,
} from '../../../../../shared/payment-reversal-calculator';
import {
  acquireTransactionAdvisoryLock,
  buildConsumerOperationLockName,
  buildConsumerOutgoingBalanceLockName,
  buildPaymentRequestOperationLockName,
} from '../../../../../shared/prisma-advisory-locks';
import { PrismaTransactionRunner } from '../../../../../shared/prisma-transaction.runner';
import { PrismaService } from '../../../../../shared/prisma.service';
import { createOutcomeIdempotent } from '../core/ledger-outcome-idempotent';
import {
  STRIPE_REVERSAL_EMAIL_OUTBOX_EVENT_TYPE,
  buildStripeReversalEmailOutboxRows,
} from '../outbox/stripe-webhook-reversal-outbox';

const reversalPaymentRequestSelect = {
  id: true,
  amount: true,
  currencyCode: true,
  payerId: true,
  requesterId: true,
  requesterEmail: true,
} as const;

const PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES = [
  $Enums.LedgerEntryType.USER_PAYMENT,
  $Enums.LedgerEntryType.USER_DEPOSIT,
] as const;

const PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES = [
  $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
  $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL,
] as const;

type AppendStripeReversalParams = {
  paymentRequestId: string;
  payerId: string;
  requesterId: string | null;
  requesterEmail?: string | null;
  currencyCode: $Enums.CurrencyCode;
  requestAmount: number;
  amount: number;
  kind: `REFUND` | `CHARGEBACK`;
  stripeObjectId?: string | null;
  metadata?: Record<string, unknown>;
  logger: Logger;
  assertRequesterBalance?: (params: {
    tx: Prisma.TransactionClient;
    requesterId: string;
    currencyCode: $Enums.CurrencyCode;
    finalAmount: number;
  }) => Promise<void>;
};

@Injectable()
export class StripeWebhookReversalsRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transactions: PrismaTransactionRunner = new PrismaTransactionRunner(prisma),
  ) {}

  async resolveDisputeLedgerEntryIdByPaymentIntent(paymentIntentId: string) {
    const entry = await this.prisma.ledgerEntryModel.findFirst({
      where: {
        stripeId: paymentIntentId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
      },
      select: { id: true },
      orderBy: { createdAt: `desc` },
    });
    if (entry) {
      return entry.id;
    }

    const byOutcome = await this.prisma.ledgerEntryOutcomeModel.findFirst({
      where: { externalId: paymentIntentId },
      orderBy: { createdAt: `desc` },
      select: { ledgerEntryId: true },
    });

    return byOutcome?.ledgerEntryId ?? null;
  }

  async resolvePaymentRequestByPaymentIntent(paymentIntentId: string) {
    const byOutcome = await this.prisma.ledgerEntryOutcomeModel.findFirst({
      where: { externalId: paymentIntentId },
      orderBy: { createdAt: `desc` },
      select: {
        ledgerEntry: {
          select: {
            paymentRequest: {
              select: reversalPaymentRequestSelect,
            },
          },
        },
      },
    });
    if (byOutcome?.ledgerEntry?.paymentRequest) {
      return byOutcome.ledgerEntry.paymentRequest;
    }

    const entry = await this.prisma.ledgerEntryModel.findFirst({
      where: {
        stripeId: paymentIntentId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
      },
      select: {
        paymentRequest: {
          select: reversalPaymentRequestSelect,
        },
      },
      orderBy: { createdAt: `desc` },
    });

    return entry?.paymentRequest ?? null;
  }

  async appendRefundUpdatedOutcome(params: { refundId: string; status: $Enums.TransactionStatus; logger: Logger }) {
    await this.transactions.runLedgerMutation(async (tx) => {
      const entries = await tx.ledgerEntryModel.findMany({
        where: {
          stripeId: params.refundId,
          type: { in: [...PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES] },
        },
        select: { id: true },
      });
      for (const entry of entries) {
        await createOutcomeIdempotent(
          tx,
          {
            ledgerEntryId: entry.id,
            status: params.status,
            source: `stripe`,
            externalId: `refund-update:${params.refundId}:${params.status}`,
          },
          params.logger,
        );
      }
    });
  }

  async hasManualChargebackReversal(paymentRequestId: string) {
    const entries = await this.prisma.ledgerEntryModel.findMany({
      where: {
        paymentRequestId,
        type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
      },
      select: { metadata: true },
    });

    return entries.some((entry) => {
      if (!entry.metadata || typeof entry.metadata !== `object` || Array.isArray(entry.metadata)) return false;
      const metadata = entry.metadata as Record<string, unknown>;
      return metadata.source === `admin` && metadata.stripeObjectType === `manual_chargeback`;
    });
  }

  async createDisputeIfMissing(params: {
    ledgerEntryId: string;
    stripeDisputeId: string;
    status: string;
    amount: number;
    reason?: string | null;
  }) {
    await this.transactions.runLedgerMutation(async (tx) => {
      await acquireTransactionAdvisoryLock(
        tx,
        buildConsumerOperationLockName(params.ledgerEntryId, `${params.stripeDisputeId}:dispute`),
      );
      const existingDispute = await tx.ledgerEntryDisputeModel.findFirst({
        where: { ledgerEntryId: params.ledgerEntryId, stripeDisputeId: params.stripeDisputeId },
        select: { id: true },
      });
      if (existingDispute) {
        return;
      }
      try {
        await tx.ledgerEntryDisputeModel.create({
          data: {
            ledgerEntryId: params.ledgerEntryId,
            stripeDisputeId: params.stripeDisputeId,
            metadata: {
              status: params.status,
              amount: params.amount,
              reason: params.reason ?? null,
              updatedAt: new Date().toISOString(),
            },
          },
        });
      } catch (err) {
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
          return;
        }
        throw err;
      }
    });
  }

  async appendStripeReversal(params: AppendStripeReversalParams): Promise<number> {
    const idempotencyKeys = buildStripeReversalLedgerIdempotencyKeys({
      kind: params.kind,
      stripeObjectId: params.stripeObjectId,
    });
    const rail = params.kind === `CHARGEBACK` ? $Enums.PaymentRail.STRIPE_CHARGEBACK : $Enums.PaymentRail.STRIPE_REFUND;
    const baseMetadata = {
      rail,
      reversalKind: params.kind,
      source: `stripe`,
      stripeObjectType: params.kind === `REFUND` ? `refund` : `dispute`,
      ...(params.metadata ?? {}),
    } as const;

    const ledgerId = newUuid();
    let appendedAmount = 0;

    try {
      await this.transactions.runLedgerMutation(async (tx) => {
        await acquireTransactionAdvisoryLock(
          tx,
          buildPaymentRequestOperationLockName(params.paymentRequestId, `stripe-reversal-pr`),
        );

        const reversalEntries = await tx.ledgerEntryModel.findMany({
          where: {
            paymentRequestId: params.paymentRequestId,
            type: { in: [...PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES] },
          },
          select: {
            amount: true,
            status: true,
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true },
            },
          },
        });
        const alreadyReversed = calculateAlreadyReversedAmount(reversalEntries);
        const { finalAmount } = capExternalReversalAmount({
          requestAmount: params.requestAmount,
          alreadyReversed,
          externalAmount: params.amount,
        });
        if (finalAmount <= 0) {
          return;
        }
        appendedAmount = finalAmount;

        const requesterSettlementEntry = params.requesterId
          ? await tx.ledgerEntryModel.findFirst({
              where: {
                paymentRequestId: params.paymentRequestId,
                consumerId: params.requesterId,
                amount: { gt: 0 },
                type: { in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] },
              },
              orderBy: { createdAt: `desc` },
              select: {
                type: true,
                ledgerId: true,
                paymentRequest: {
                  select: {
                    paymentRail: true,
                  },
                },
              },
            })
          : null;
        const requesterReversalType = getRequesterReversalEntryType({
          settlementEntryType: requesterSettlementEntry?.type,
          paymentRail: requesterSettlementEntry?.paymentRequest?.paymentRail ?? null,
        });
        const payerSettlementEntry = await tx.ledgerEntryModel.findFirst({
          where: {
            paymentRequestId: params.paymentRequestId,
            consumerId: params.payerId,
            amount: { lt: 0 },
            type: $Enums.LedgerEntryType.USER_PAYMENT,
          },
          orderBy: { createdAt: `desc` },
          select: { ledgerId: true },
        });
        const payerMetadata = {
          ...baseMetadata,
          reversalOfLedgerId: payerSettlementEntry?.ledgerId ?? null,
        } as Prisma.InputJsonValue;
        const requesterMetadata = {
          ...baseMetadata,
          reversalOfLedgerId: requesterSettlementEntry?.ledgerId ?? null,
        } as Prisma.InputJsonValue;

        if (params.requesterId) {
          await acquireTransactionAdvisoryLock(tx, buildConsumerOutgoingBalanceLockName(params.requesterId));
          await acquireTransactionAdvisoryLock(
            tx,
            buildConsumerOperationLockName(params.requesterId, `stripe-reversal`),
          );

          if (params.assertRequesterBalance) {
            await params.assertRequesterBalance({
              tx,
              requesterId: params.requesterId,
              currencyCode: params.currencyCode,
              finalAmount,
            });
          }
        }

        await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId: params.payerId,
            paymentRequestId: params.paymentRequestId,
            type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
            currencyCode: params.currencyCode,
            status: $Enums.TransactionStatus.COMPLETED,
            amount: appendedAmount,
            createdBy: `stripe`,
            updatedBy: `stripe`,
            metadata: payerMetadata,
            stripeId: params.stripeObjectId ?? undefined,
            idempotencyKey: idempotencyKeys.payer,
          },
        });

        if (params.requesterId) {
          await tx.ledgerEntryModel.create({
            data: {
              ledgerId,
              consumerId: params.requesterId,
              paymentRequestId: params.paymentRequestId,
              type: requesterReversalType,
              currencyCode: params.currencyCode,
              status: $Enums.TransactionStatus.COMPLETED,
              amount: -appendedAmount,
              createdBy: `stripe`,
              updatedBy: `stripe`,
              metadata: requesterMetadata,
              stripeId: params.stripeObjectId ?? undefined,
              idempotencyKey: idempotencyKeys.requester,
            },
          });
        }

        const outboxRows = buildStripeReversalEmailOutboxRows({
          aggregateId: ledgerId,
          idempotencyKeyBase: idempotencyKeys.payer,
          paymentRequestId: params.paymentRequestId,
          payerId: params.payerId,
          requesterId: params.requesterId,
          requesterEmail: params.requesterEmail ?? undefined,
          amount: appendedAmount,
          currencyCode: params.currencyCode,
          kind: params.kind,
          reason: typeof params.metadata?.reason === `string` ? params.metadata.reason : null,
        });
        if (outboxRows.length > 0) {
          await tx.notificationOutboxModel.createMany({
            data: outboxRows,
            skipDuplicates: true,
          });
        }
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
        params.logger.debug(`Reversal already created (idempotent skip)`);
        return 0;
      }
      throw err;
    }

    params.logger.debug({
      event: STRIPE_REVERSAL_EMAIL_OUTBOX_EVENT_TYPE,
      paymentRequestId: params.paymentRequestId,
      kind: params.kind,
      outboxQueued: appendedAmount > 0,
    });

    return appendedAmount;
  }
}
