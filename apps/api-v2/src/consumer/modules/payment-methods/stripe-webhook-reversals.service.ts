import { randomUUID } from 'crypto';

import { Inject, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { createOutcomeIdempotent } from './ledger-outcome-idempotent';
import { CONSUMER_STRIPE_WEBHOOK_CLIENT } from './stripe-webhook.tokens';
import { BalanceCalculationMode, BalanceCalculationService } from '../../../shared/balance-calculation.service';
import { MailingService } from '../../../shared/mailing.service';
import { resolvePaymentLinkConsumerAppScopeFromLedgerHistory } from '../../../shared/payment-link-scope-resolver';
import {
  acquireTransactionAdvisoryLock,
  buildConsumerOperationLockName,
  buildConsumerOutgoingBalanceLockName,
  buildPaymentRequestOperationLockName,
} from '../../../shared/prisma-advisory-locks';
import { PrismaService } from '../../../shared/prisma.service';
import { getCurrencyFractionDigits } from '../../../shared-common';

import type Stripe from 'stripe';

@Injectable()
export class StripeWebhookReversalsService {
  private static readonly PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES = [
    $Enums.LedgerEntryType.USER_PAYMENT,
    $Enums.LedgerEntryType.USER_DEPOSIT,
  ] as const;
  private static readonly PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES = [
    $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
    $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL,
  ] as const;

  private readonly logger = new Logger(StripeWebhookReversalsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailingService: MailingService,
    private readonly balanceService: BalanceCalculationService,
    @Inject(CONSUMER_STRIPE_WEBHOOK_CLIENT) private readonly stripe: Stripe,
  ) {}

  async handleChargeRefunded(charge: Stripe.Charge) {
    const paymentIntentId =
      typeof charge.payment_intent === `string` ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId) return;

    const paymentRequest = await this.resolvePaymentRequestByPaymentIntent(paymentIntentId);
    if (!paymentRequest) return;

    const requestAmount = Number(paymentRequest.amount);
    const digits = getCurrencyFractionDigits(paymentRequest.currencyCode);

    for (const refund of charge.refunds?.data ?? []) {
      if (refund.status && refund.status !== `succeeded`) continue;
      const refundAmount = refund.amount / 10 ** digits;

      await this.createStripeReversal({
        paymentRequestId: paymentRequest.id,
        payerId: paymentRequest.payerId,
        requesterId: paymentRequest.requesterId,
        requesterEmail: paymentRequest.requesterEmail,
        currencyCode: paymentRequest.currencyCode,
        requestAmount,
        amount: refundAmount,
        kind: `REFUND`,
        stripeObjectId: refund.id,
        metadata: {
          stripeChargeId: charge.id,
          stripeRefundId: refund.id,
          stripePaymentIntentId: paymentIntentId,
          reason: refund.reason ?? null,
        },
      });
    }
  }

  async handleRefundUpdated(refund: Stripe.Refund) {
    const status =
      refund.status === `succeeded`
        ? $Enums.TransactionStatus.COMPLETED
        : refund.status === `failed` || refund.status === `canceled`
          ? $Enums.TransactionStatus.DENIED
          : $Enums.TransactionStatus.PENDING;
    const transitionExternalId = `refund-update:${refund.id}:${status}`;

    await this.prisma.$transaction(async (tx) => {
      const entries = await tx.ledgerEntryModel.findMany({
        where: {
          stripeId: refund.id,
          type: { in: [...StripeWebhookReversalsService.PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES] },
        },
        select: { id: true },
      });
      for (const entry of entries) {
        await createOutcomeIdempotent(
          tx,
          {
            ledgerEntryId: entry.id,
            status,
            source: `stripe`,
            externalId: transitionExternalId,
          },
          this.logger,
        );
      }
    });
  }

  async handleChargeDispute(dispute: Stripe.Dispute) {
    if (!dispute.charge || typeof dispute.charge !== `string`) return;

    const charge = await this.stripe.charges.retrieve(dispute.charge);
    const paymentIntentId =
      typeof charge.payment_intent === `string` ? charge.payment_intent : charge.payment_intent?.id;
    if (!paymentIntentId) return;

    const paymentRequest = await this.resolvePaymentRequestByPaymentIntent(paymentIntentId);
    if (!paymentRequest) return;

    await this.recordDisputeStatus({
      paymentIntentId,
      dispute,
    });

    if (dispute.status !== `lost`) return;

    const existingManualChargeback = await this.prisma.ledgerEntryModel.findMany({
      where: {
        paymentRequestId: paymentRequest.id,
        type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
      },
      select: { metadata: true },
    });

    const hasManualChargeback = existingManualChargeback.some((entry) => {
      if (!entry.metadata || typeof entry.metadata !== `object` || Array.isArray(entry.metadata)) return false;
      const metadata = entry.metadata as Record<string, unknown>;
      return metadata.source === `admin` && metadata.stripeObjectType === `manual_chargeback`;
    });

    if (hasManualChargeback) return;

    const requestAmount = Number(paymentRequest.amount);
    const digits = getCurrencyFractionDigits(paymentRequest.currencyCode);
    const disputeAmount = dispute.amount / 10 ** digits;

    await this.createStripeReversal({
      paymentRequestId: paymentRequest.id,
      payerId: paymentRequest.payerId,
      requesterId: paymentRequest.requesterId,
      requesterEmail: paymentRequest.requesterEmail,
      currencyCode: paymentRequest.currencyCode,
      requestAmount,
      amount: disputeAmount,
      kind: `CHARGEBACK`,
      stripeObjectId: dispute.id,
      metadata: {
        stripeChargeId: charge.id,
        stripeDisputeId: dispute.id,
        stripePaymentIntentId: paymentIntentId,
        reason: dispute.reason ?? null,
        disputeStatus: dispute.status,
      },
    });
  }

  async recordDisputeStatus(params: { paymentIntentId: string; dispute: Stripe.Dispute }) {
    const { paymentIntentId, dispute } = params;
    const createDisputeIfMissing = async (ledgerEntryId: string) => {
      await this.prisma.$transaction(async (tx) => {
        await acquireTransactionAdvisoryLock(
          tx,
          buildConsumerOperationLockName(ledgerEntryId, `${dispute.id}:dispute`),
        );
        const existingDispute = await tx.ledgerEntryDisputeModel.findFirst({
          where: { ledgerEntryId, stripeDisputeId: dispute.id },
          select: { id: true },
        });
        if (existingDispute) {
          return;
        }
        try {
          await tx.ledgerEntryDisputeModel.create({
            data: {
              ledgerEntryId,
              stripeDisputeId: dispute.id,
              metadata: {
                status: dispute.status,
                amount: dispute.amount,
                reason: dispute.reason ?? null,
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
    };

    const entry = await this.prisma.ledgerEntryModel.findFirst({
      where: {
        stripeId: paymentIntentId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
      },
      select: { id: true },
      orderBy: { createdAt: `desc` },
    });
    if (!entry) {
      const byOutcome = await this.prisma.ledgerEntryOutcomeModel.findFirst({
        where: { externalId: paymentIntentId },
        orderBy: { createdAt: `desc` },
        select: { ledgerEntryId: true },
      });
      if (!byOutcome) return;
      await createDisputeIfMissing(byOutcome.ledgerEntryId);
      return;
    }

    await createDisputeIfMissing(entry.id);
  }

  async createStripeReversal(
    params: {
      paymentRequestId: string;
      payerId: string | null;
      requesterId: string | null;
      requesterEmail?: string | null;
      currencyCode: $Enums.CurrencyCode;
      requestAmount: number;
      amount: number;
      kind: `REFUND` | `CHARGEBACK`;
      stripeObjectId?: string | null;
      metadata?: Record<string, unknown>;
    },
    handlers?: {
      sendReversalEmails?: (params: {
        paymentRequestId: string;
        payerId: string;
        requesterId: string | null;
        requesterEmail?: string;
        amount: number;
        currencyCode: $Enums.CurrencyCode;
        kind: `REFUND` | `CHARGEBACK`;
        reason?: string | null;
      }) => Promise<unknown> | unknown;
    },
  ) {
    const {
      paymentRequestId,
      payerId,
      requesterId,
      requesterEmail,
      currencyCode,
      requestAmount,
      amount,
      kind,
      stripeObjectId,
      metadata = {},
    } = params;

    if (!payerId) return;

    const kindLower = kind.toLowerCase();
    const idempotencyKeyPayer = stripeObjectId != null ? `reversal:${kindLower}:${stripeObjectId}:payer` : undefined;
    const idempotencyKeyRequester =
      stripeObjectId != null ? `reversal:${kindLower}:${stripeObjectId}:requester` : undefined;

    const rail = kind === `CHARGEBACK` ? $Enums.PaymentRail.STRIPE_CHARGEBACK : $Enums.PaymentRail.STRIPE_REFUND;
    const baseMetadata = {
      rail,
      reversalKind: kind,
      source: `stripe`,
      stripeObjectType: kind === `REFUND` ? `refund` : `dispute`,
      ...metadata,
    } as const;

    const ledgerId = randomUUID();
    let appendedAmount = 0;

    try {
      await this.prisma.$transaction(async (tx) => {
        await acquireTransactionAdvisoryLock(
          tx,
          buildPaymentRequestOperationLockName(paymentRequestId, `stripe-reversal-pr`),
        );

        const reversalEntries = await tx.ledgerEntryModel.findMany({
          where: {
            paymentRequestId,
            type: { in: [...StripeWebhookReversalsService.PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES] },
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
        const alreadyReversed = reversalEntries.reduce((sum, entry) => {
          const effectiveStatus = this.getEffectiveStatus(entry);
          if (
            effectiveStatus !== $Enums.TransactionStatus.COMPLETED &&
            effectiveStatus !== $Enums.TransactionStatus.PENDING
          ) {
            return sum;
          }
          const entryAmount = Number(entry.amount);
          return entryAmount > 0 ? sum + entryAmount : sum;
        }, 0);
        const remaining = requestAmount - alreadyReversed;
        const finalAmount = Math.min(amount, remaining);
        if (finalAmount <= 0) {
          return;
        }
        appendedAmount = finalAmount;

        const requesterSettlementEntry = requesterId
          ? await tx.ledgerEntryModel.findFirst({
              where: {
                paymentRequestId,
                consumerId: requesterId,
                amount: { gt: 0 },
                type: { in: [...StripeWebhookReversalsService.PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] },
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
        const requesterReversalType = this.getRequesterReversalEntryType({
          settlementEntryType: requesterSettlementEntry?.type,
          paymentRail: requesterSettlementEntry?.paymentRequest?.paymentRail ?? null,
        });
        const payerSettlementEntry = await tx.ledgerEntryModel.findFirst({
          where: {
            paymentRequestId,
            consumerId: payerId,
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

        if (requesterId) {
          await acquireTransactionAdvisoryLock(tx, buildConsumerOutgoingBalanceLockName(requesterId));
          await acquireTransactionAdvisoryLock(tx, buildConsumerOperationLockName(requesterId, `stripe-reversal`));

          if (kind === `CHARGEBACK`) {
            const requesterBalance = await this.balanceService.calculateInTransaction(tx, requesterId, currencyCode, {
              mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
            });
            if (requesterBalance < finalAmount) {
              throw new ServiceUnavailableException(errorCodes.INSUFFICIENT_REQUESTER_BALANCE_REVERSAL_STRIPE);
            }
          }
        }

        await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId: payerId,
            paymentRequestId,
            type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
            currencyCode,
            status: $Enums.TransactionStatus.COMPLETED,
            amount: appendedAmount,
            createdBy: `stripe`,
            updatedBy: `stripe`,
            metadata: payerMetadata,
            stripeId: stripeObjectId ?? undefined,
            idempotencyKey: idempotencyKeyPayer ?? undefined,
          },
        });

        if (requesterId) {
          await tx.ledgerEntryModel.create({
            data: {
              ledgerId,
              consumerId: requesterId,
              paymentRequestId,
              type: requesterReversalType,
              currencyCode,
              status: $Enums.TransactionStatus.COMPLETED,
              amount: -appendedAmount,
              createdBy: `stripe`,
              updatedBy: `stripe`,
              metadata: requesterMetadata,
              stripeId: stripeObjectId ?? undefined,
              idempotencyKey: idempotencyKeyRequester ?? undefined,
            },
          });
        }
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
        this.logger.debug(`Reversal already created (idempotent skip)`);
        return;
      }
      throw err;
    }

    if (appendedAmount <= 0) {
      return;
    }

    const sendReversalEmails = handlers?.sendReversalEmails ?? ((sendParams) => this.sendReversalEmails(sendParams));
    await sendReversalEmails({
      paymentRequestId,
      payerId,
      requesterId,
      requesterEmail: requesterEmail ?? undefined,
      amount: appendedAmount,
      currencyCode,
      kind,
      reason: typeof metadata?.reason === `string` ? metadata.reason : null,
    });
  }

  async sendReversalEmails(params: {
    paymentRequestId: string;
    payerId: string;
    requesterId: string | null;
    requesterEmail?: string;
    amount: number;
    currencyCode: $Enums.CurrencyCode;
    kind: `REFUND` | `CHARGEBACK`;
    reason?: string | null;
  }) {
    const { paymentRequestId, payerId, requesterId, requesterEmail, amount, currencyCode, kind, reason } = params;
    const consumerAppScope = await this.resolvePaymentLinkConsumerAppScope(paymentRequestId);
    const consumerIds = [payerId, ...(requesterId ? [requesterId] : [])];
    const consumers = await this.prisma.consumerModel.findMany({
      where: { id: { in: consumerIds } },
      select: { id: true, email: true },
    });

    const payer = consumers.find((consumer) => consumer.id === payerId);
    const requester = requesterId ? consumers.find((consumer) => consumer.id === requesterId) : null;
    const requesterEmailResolved = requester?.email ?? requesterEmail ?? ``;

    if (!payer?.email) return;

    if (kind === `REFUND`) {
      await this.mailingService.sendPaymentRefundEmail({
        recipientEmail: payer.email,
        counterpartyEmail: requesterEmailResolved,
        amount,
        currencyCode,
        reason,
        paymentRequestId,
        role: `payer`,
        consumerAppScope,
      });
      if (requesterEmailResolved) {
        await this.mailingService.sendPaymentRefundEmail({
          recipientEmail: requesterEmailResolved,
          counterpartyEmail: payer.email,
          amount,
          currencyCode,
          reason,
          paymentRequestId,
          role: `requester`,
          consumerAppScope,
        });
      }
      return;
    }

    await this.mailingService.sendPaymentChargebackEmail({
      recipientEmail: payer.email,
      counterpartyEmail: requesterEmailResolved,
      amount,
      currencyCode,
      reason,
      paymentRequestId,
      role: `payer`,
      consumerAppScope,
    });
    if (requesterEmailResolved) {
      await this.mailingService.sendPaymentChargebackEmail({
        recipientEmail: requesterEmailResolved,
        counterpartyEmail: payer.email,
        amount,
        currencyCode,
        reason,
        paymentRequestId,
        role: `requester`,
        consumerAppScope,
      });
    }
  }

  private async resolvePaymentLinkConsumerAppScope(paymentRequestId: string): Promise<ConsumerAppScope | undefined> {
    return resolvePaymentLinkConsumerAppScopeFromLedgerHistory(this.prisma, paymentRequestId);
  }

  private async resolvePaymentRequestByPaymentIntent(paymentIntentId: string) {
    const byOutcome = await this.prisma.ledgerEntryOutcomeModel.findFirst({
      where: { externalId: paymentIntentId },
      orderBy: { createdAt: `desc` },
      select: {
        ledgerEntry: {
          select: {
            paymentRequestId: true,
            paymentRequest: {
              select: {
                id: true,
                amount: true,
                currencyCode: true,
                payerId: true,
                requesterId: true,
                requesterEmail: true,
              },
            },
          },
        },
      },
    });
    if (byOutcome?.ledgerEntry?.paymentRequest) return byOutcome.ledgerEntry.paymentRequest;

    const entry = await this.prisma.ledgerEntryModel.findFirst({
      where: {
        stripeId: paymentIntentId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
      },
      select: {
        paymentRequestId: true,
        paymentRequest: {
          select: {
            id: true,
            amount: true,
            currencyCode: true,
            payerId: true,
            requesterId: true,
            requesterEmail: true,
          },
        },
      },
      orderBy: { createdAt: `desc` },
    });

    if (!entry?.paymentRequest) return null;

    return entry.paymentRequest;
  }

  private getEffectiveStatus(entry: {
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }): $Enums.TransactionStatus {
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private getRequesterReversalEntryType(params: {
    settlementEntryType: $Enums.LedgerEntryType | null | undefined;
    paymentRail?: $Enums.PaymentRail | null;
  }): $Enums.LedgerEntryType {
    return params.settlementEntryType === $Enums.LedgerEntryType.USER_DEPOSIT ||
      params.paymentRail === $Enums.PaymentRail.CARD
      ? $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL
      : $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL;
  }
}
