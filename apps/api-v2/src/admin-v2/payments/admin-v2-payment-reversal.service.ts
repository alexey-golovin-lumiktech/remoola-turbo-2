import { createHash, randomUUID } from 'crypto';

import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';

import { type ConsumerAppScope, type TPaymentReversalKind } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';
import { adminErrorCodes, errorCodes } from '@remoola/shared-constants';

import { AdminActionAuditService, ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { BalanceCalculationMode, BalanceCalculationService } from '../../shared/balance-calculation.service';
import { MailingService } from '../../shared/mailing.service';
import { resolvePaymentLinkConsumerAppScopeFromLedgerHistory } from '../../shared/payment-link-scope-resolver';
import {
  acquireTransactionAdvisoryLock,
  buildConsumerOperationLockName,
  buildConsumerOutgoingBalanceLockName,
  buildPaymentRequestOperationLockName,
} from '../../shared/prisma-advisory-locks';
import { PrismaService } from '../../shared/prisma.service';
import { STRIPE_CLIENT } from '../../shared/stripe-client';
import { getCurrencyFractionDigits } from '../../shared-common';

type PaymentReversalCreateInput = {
  kind: TPaymentReversalKind;
  amount?: number;
  reason?: string;
};

const PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES = [
  $Enums.LedgerEntryType.USER_PAYMENT,
  $Enums.LedgerEntryType.USER_DEPOSIT,
] as const;
const PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES = [
  $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
  $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL,
] as const;

@Injectable()
export class AdminV2PaymentReversalService {
  private readonly logger = new Logger(AdminV2PaymentReversalService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailingService: MailingService,
    private readonly balanceService: BalanceCalculationService,
    private readonly adminActionAudit: AdminActionAuditService,
    @Inject(STRIPE_CLIENT) private readonly stripe: Stripe,
  ) {}

  private getEffectiveLedgerStatus(entry: {
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }): $Enums.TransactionStatus {
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private deriveEffectivePaymentRequestStatus(
    paymentRequest:
      | {
          status: $Enums.TransactionStatus;
          ledgerEntries?: Array<{
            status: $Enums.TransactionStatus;
            createdAt: Date;
            outcomes?: Array<{ status: $Enums.TransactionStatus }>;
          }>;
        }
      | null
      | undefined,
  ): $Enums.TransactionStatus | null {
    if (!paymentRequest) return null;
    const latestEntry = [...(paymentRequest.ledgerEntries ?? [])].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )[0];
    return latestEntry ? this.getEffectiveLedgerStatus(latestEntry) : paymentRequest.status;
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

  private async findExistingReversal(
    idempotencyKeyBase: string,
    remainingBefore: number,
    kind: PaymentReversalCreateInput[`kind`],
  ) {
    const existingReversal = await this.prisma.ledgerEntryModel.findFirst({
      where: { idempotencyKey: `${idempotencyKeyBase}:payer` },
      select: { ledgerId: true, amount: true },
    });
    if (!existingReversal) {
      return null;
    }
    return {
      ledgerId: existingReversal.ledgerId,
      amount: Number(existingReversal.amount),
      remaining: Math.max(0, remainingBefore - Number(existingReversal.amount)),
      kind,
    };
  }

  private async resolveStripePaymentIntentId(paymentRequestId: string): Promise<string | null> {
    const stripePayment = await this.prisma.ledgerEntryModel.findFirst({
      where: {
        paymentRequestId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        stripeId: { not: null },
      },
      select: { stripeId: true },
      orderBy: { createdAt: `desc` },
    });
    if (stripePayment?.stripeId) return stripePayment.stripeId;

    const byOutcome = await this.prisma.ledgerEntryOutcomeModel.findFirst({
      where: {
        status: $Enums.TransactionStatus.COMPLETED,
        source: `stripe`,
        externalId: { not: null },
        ledgerEntry: {
          paymentRequestId,
          type: { in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] },
        },
      },
      orderBy: { createdAt: `desc` },
      select: { externalId: true },
    });
    return byOutcome?.externalId ?? null;
  }

  private buildReversalIdempotencyKey(payload: {
    paymentRequestId: string;
    kind: PaymentReversalCreateInput[`kind`];
    amount: number;
    reason?: string | null;
  }) {
    const normalized = JSON.stringify({
      ...payload,
      reason: payload.reason?.trim() || null,
    });
    return createHash(`sha256`).update(normalized).digest(`hex`);
  }

  private async sendReversalEmails(params: {
    paymentRequestId: string;
    payerId: string;
    requesterId: string | null;
    requesterEmail?: string | null;
    amount: number;
    currencyCode: $Enums.CurrencyCode;
    kind: PaymentReversalCreateInput[`kind`];
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

  async createReversal(paymentRequestId: string, body: PaymentReversalCreateInput, adminId: string) {
    const paymentRequest = await this.prisma.paymentRequestModel.findUnique({
      where: { id: paymentRequestId },
      select: {
        id: true,
        amount: true,
        currencyCode: true,
        status: true,
        payerId: true,
        requesterId: true,
        requesterEmail: true,
        ledgerEntries: {
          where: { type: { in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] } },
          select: {
            ledgerId: true,
            type: true,
            status: true,
            createdAt: true,
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true },
            },
          },
        },
      },
    });

    if (!paymentRequest) throw new NotFoundException(adminErrorCodes.ADMIN_PAYMENT_REQUEST_NOT_FOUND);

    if (!paymentRequest.payerId) {
      throw new BadRequestException(adminErrorCodes.ADMIN_PAYMENT_REQUEST_NOT_FOUND);
    }

    if (this.deriveEffectivePaymentRequestStatus(paymentRequest) !== $Enums.TransactionStatus.COMPLETED) {
      throw new BadRequestException(adminErrorCodes.ADMIN_ONLY_COMPLETED_CAN_BE_REVERSED);
    }

    const requestAmount = Number(paymentRequest.amount);
    if (!Number.isFinite(requestAmount) || requestAmount <= 0) {
      throw new BadRequestException(adminErrorCodes.ADMIN_INVALID_PAYMENT_AMOUNT);
    }

    const requestedAmount = body.amount != null ? Number(body.amount) : undefined;
    if (requestedAmount != null && (!Number.isFinite(requestedAmount) || requestedAmount <= 0)) {
      throw new BadRequestException(adminErrorCodes.ADMIN_INVALID_REVERSAL_AMOUNT);
    }

    const originalLedgerId = paymentRequest.ledgerEntries.find(
      (entry) =>
        entry.type === $Enums.LedgerEntryType.USER_PAYMENT &&
        this.getEffectiveLedgerStatus(entry) === $Enums.TransactionStatus.COMPLETED,
    )?.ledgerId;

    const stripePaymentIntentId = await this.resolveStripePaymentIntentId(paymentRequestId);
    const requesterSettlementEntry = paymentRequest.requesterId
      ? await this.prisma.ledgerEntryModel.findFirst({
          where: {
            paymentRequestId,
            consumerId: paymentRequest.requesterId,
            amount: { gt: 0 },
            type: { in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] },
          },
          select: {
            type: true,
            ledgerId: true,
            paymentRequest: {
              select: {
                paymentRail: true,
              },
            },
          },
          orderBy: { createdAt: `desc` },
        })
      : null;
    const requesterReversalType = this.getRequesterReversalEntryType({
      settlementEntryType: requesterSettlementEntry?.type,
      paymentRail: requesterSettlementEntry?.paymentRequest?.paymentRail ?? null,
    });

    const executeReversal = async () => {
      return this.prisma.$transaction(async (tx) => {
        await acquireTransactionAdvisoryLock(
          tx,
          buildPaymentRequestOperationLockName(paymentRequestId, `payment-request-reversal`),
        );

        if (paymentRequest.requesterId) {
          await acquireTransactionAdvisoryLock(tx, buildConsumerOutgoingBalanceLockName(paymentRequest.requesterId));
          await acquireTransactionAdvisoryLock(
            tx,
            buildConsumerOperationLockName(paymentRequest.requesterId, `reversal`),
          );
        }

        const reversalEntries = await tx.ledgerEntryModel.findMany({
          where: {
            paymentRequestId,
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

        const alreadyReversed = reversalEntries.reduce((sum, entry) => {
          const effectiveStatus = this.getEffectiveLedgerStatus(entry);
          if (
            effectiveStatus !== $Enums.TransactionStatus.COMPLETED &&
            effectiveStatus !== $Enums.TransactionStatus.PENDING
          ) {
            return sum;
          }
          const amount = Number(entry.amount);
          return amount > 0 ? sum + amount : sum;
        }, 0);

        const remainingBefore = requestAmount - alreadyReversed;
        if (remainingBefore <= 0) {
          throw new BadRequestException(adminErrorCodes.ADMIN_PAYMENT_REQUEST_ALREADY_FULLY_REVERSED);
        }

        const finalRequestedAmount = requestedAmount ?? remainingBefore;
        if (finalRequestedAmount > remainingBefore) {
          throw new BadRequestException(adminErrorCodes.ADMIN_REVERSAL_AMOUNT_EXCEEDS_REMAINING_BALANCE);
        }

        const idempotencyKeyBase = this.buildReversalIdempotencyKey({
          paymentRequestId,
          kind: body.kind,
          amount: finalRequestedAmount,
          reason: body.reason ?? null,
        });

        const existingReversal = await tx.ledgerEntryModel.findFirst({
          where: { idempotencyKey: `${idempotencyKeyBase}:payer` },
          select: { ledgerId: true, amount: true },
        });

        if (existingReversal) {
          return {
            ledgerId: existingReversal.ledgerId,
            amount: Number(existingReversal.amount),
            remaining: Math.max(0, remainingBefore - Number(existingReversal.amount)),
            kind: body.kind,
            alreadyExisted: true,
          };
        }

        let stripeRefundId: string | null = null;
        let reversalStatus: $Enums.TransactionStatus = $Enums.TransactionStatus.COMPLETED;
        if (body.kind === `REFUND`) {
          if (!stripePaymentIntentId) {
            throw new BadRequestException(adminErrorCodes.ADMIN_STRIPE_PAYMENT_INTENT_NOT_FOUND_FOR_REFUND);
          }

          const digits = getCurrencyFractionDigits(paymentRequest.currencyCode);
          const amountMinor = Math.round(finalRequestedAmount * 10 ** digits);
          const refund = await this.stripe.refunds.create(
            {
              payment_intent: stripePaymentIntentId,
              amount: amountMinor,
              metadata: {
                paymentRequestId,
                adminId,
                reversalKind: body.kind,
                reason: body.reason ?? ``,
              },
            },
            { idempotencyKey: `refund:${idempotencyKeyBase}` },
          );

          stripeRefundId = refund.id;
          if (refund.status && refund.status !== `succeeded`) {
            reversalStatus = $Enums.TransactionStatus.PENDING;
          }
        } else if (paymentRequest.requesterId) {
          const requesterBalance = await this.balanceService.calculateInTransaction(
            tx,
            paymentRequest.requesterId,
            paymentRequest.currencyCode,
            { mode: BalanceCalculationMode.COMPLETED_AND_PENDING },
          );
          if (requesterBalance < finalRequestedAmount) {
            throw new BadRequestException(errorCodes.INSUFFICIENT_REQUESTER_BALANCE_REVERSAL_ADMIN);
          }
        }

        const ledgerId = randomUUID();
        const rail =
          body.kind === `CHARGEBACK` ? $Enums.PaymentRail.STRIPE_CHARGEBACK : $Enums.PaymentRail.STRIPE_REFUND;
        const baseMetadata = {
          rail,
          reversalKind: body.kind,
          source: `admin`,
          stripeObjectType: body.kind === `REFUND` ? `refund` : `manual_chargeback`,
          reason: body.reason ?? null,
          stripePaymentIntentId,
          stripeRefundId,
        } as const;
        const payerMetadata = {
          ...baseMetadata,
          reversalOfLedgerId: originalLedgerId ?? null,
        } as Prisma.InputJsonValue;
        const requesterMetadata = {
          ...baseMetadata,
          reversalOfLedgerId: requesterSettlementEntry?.ledgerId ?? null,
        } as Prisma.InputJsonValue;

        await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId: paymentRequest.payerId,
            paymentRequestId,
            type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
            currencyCode: paymentRequest.currencyCode,
            status: reversalStatus,
            amount: finalRequestedAmount,
            createdBy: adminId,
            updatedBy: adminId,
            metadata: payerMetadata,
            idempotencyKey: `${idempotencyKeyBase}:payer`,
            stripeId: stripeRefundId ?? undefined,
          },
        });

        if (paymentRequest.requesterId) {
          await tx.ledgerEntryModel.create({
            data: {
              ledgerId,
              consumerId: paymentRequest.requesterId,
              paymentRequestId,
              type: requesterReversalType,
              currencyCode: paymentRequest.currencyCode,
              status: reversalStatus,
              amount: -finalRequestedAmount,
              createdBy: adminId,
              updatedBy: adminId,
              metadata: requesterMetadata,
              idempotencyKey: `${idempotencyKeyBase}:requester`,
              stripeId: stripeRefundId ?? undefined,
            },
          });
        }

        return {
          ledgerId,
          amount: finalRequestedAmount,
          remaining: remainingBefore - finalRequestedAmount,
          kind: body.kind,
          alreadyExisted: false,
        };
      });
    };

    let result: {
      ledgerId: string;
      amount: number;
      remaining: number;
      kind: PaymentReversalCreateInput[`kind`];
      alreadyExisted: boolean;
    };

    try {
      result = await executeReversal();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
        throw err;
      }
      if (body.kind === `REFUND`) {
        this.logger.error({
          event: `admin_refund_ledger_append_failed_retrying`,
          paymentRequestId,
          errorClass: err instanceof Error ? err.name : `UnknownError`,
        });
        try {
          result = await executeReversal();
        } catch (retryErr) {
          this.logger.error({
            event: `admin_refund_ledger_append_failed_waiting_for_webhook_reconciliation`,
            paymentRequestId,
            errorClass: retryErr instanceof Error ? retryErr.name : `UnknownError`,
          });
          throw retryErr;
        }
      } else {
        throw err;
      }
    }

    if (!result.alreadyExisted) {
      await this.adminActionAudit.record({
        adminId,
        action:
          body.kind === `REFUND`
            ? ADMIN_ACTION_AUDIT_ACTIONS.payment_refund
            : ADMIN_ACTION_AUDIT_ACTIONS.payment_chargeback,
        resource: `payment_request`,
        resourceId: paymentRequestId,
        metadata: {
          amount: result.amount,
          currencyCode: paymentRequest.currencyCode,
          ledgerId: result.ledgerId,
        },
      });

      await this.sendReversalEmails({
        paymentRequestId,
        payerId: paymentRequest.payerId,
        requesterId: paymentRequest.requesterId,
        requesterEmail: paymentRequest.requesterEmail,
        amount: result.amount,
        currencyCode: paymentRequest.currencyCode,
        kind: body.kind,
        reason: body.reason ?? null,
      });
    }

    return {
      ledgerId: result.ledgerId,
      amount: result.amount,
      remaining: result.remaining,
      kind: result.kind,
    };
  }
}
