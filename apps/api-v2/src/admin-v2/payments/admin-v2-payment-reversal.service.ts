import { randomUUID } from 'crypto';

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
  buildAdminPaymentReversalIdempotencyKey,
  calculateAlreadyReversedAmount,
  deriveEffectivePaymentRequestStatus,
  getEffectiveLedgerStatus,
  getRequesterReversalEntryType,
  resolveStrictReversalAmount,
} from '../../shared/payment-reversal-calculator';
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

type ExistingReversalRow = {
  id: string;
  ledgerId: string;
  amount: number | string | { toString(): string };
  stripeId?: string | null;
  status?: $Enums.TransactionStatus;
  outcomes?: Array<{ status: $Enums.TransactionStatus }>;
};

type ReversalResult = {
  ledgerId: string;
  amount: number;
  remaining: number;
  kind: PaymentReversalCreateInput[`kind`];
  alreadyExisted: boolean;
  idempotencyKeyBase?: string;
  stripePaymentIntentId?: string | null;
  existingStripeRefundId?: string | null;
  needsRefundFinalize?: boolean;
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

  private isReusableExistingReversal(existingReversal: ExistingReversalRow): boolean {
    const status = this.getExistingReversalStatus(existingReversal);
    return (
      status === $Enums.TransactionStatus.COMPLETED ||
      status === $Enums.TransactionStatus.PENDING ||
      status === $Enums.TransactionStatus.DENIED
    );
  }

  private getExistingReversalStatus(existingReversal: ExistingReversalRow): $Enums.TransactionStatus | null {
    if (!existingReversal.status) return null;
    return getEffectiveLedgerStatus(existingReversal as Required<Pick<ExistingReversalRow, `status`>>);
  }

  private shouldFinalizeExistingRefund(existingReversal: ExistingReversalRow): boolean {
    const status = this.getExistingReversalStatus(existingReversal);
    return status === $Enums.TransactionStatus.PENDING || status === $Enums.TransactionStatus.DENIED;
  }

  private getRefundTransactionStatus(
    stripeStatus: Stripe.Refund[`status`] | null | undefined,
  ): $Enums.TransactionStatus {
    return stripeStatus && stripeStatus !== `succeeded`
      ? $Enums.TransactionStatus.PENDING
      : $Enums.TransactionStatus.COMPLETED;
  }

  private async createOutcomeIdempotent(
    client: Pick<Prisma.TransactionClient, `ledgerEntryOutcomeModel`>,
    data: {
      ledgerEntryId: string;
      status: $Enums.TransactionStatus;
      source: string;
      externalId: string;
    },
  ) {
    try {
      await client.ledgerEntryOutcomeModel.create({
        data: {
          ledgerEntry: { connect: { id: data.ledgerEntryId } },
          status: data.status,
          source: data.source,
          externalId: data.externalId,
        },
      });
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
        this.logger.debug(`Ledger outcome already recorded (idempotent skip)`);
        return;
      }
      throw err;
    }
  }

  private async finalizeRefundReversal(params: {
    ledgerId: string;
    adminId: string;
    stripeRefundId: string;
    status: $Enums.TransactionStatus;
  }) {
    const { ledgerId, adminId, stripeRefundId, status } = params;
    await this.prisma.$transaction(async (tx) => {
      const entries = await tx.ledgerEntryModel.findMany({
        where: {
          ledgerId,
          type: { in: [...PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES] },
        },
        select: { id: true },
      });

      await tx.ledgerEntryModel.updateMany({
        where: { id: { in: entries.map((entry) => entry.id) } },
        data: { stripeId: stripeRefundId, updatedBy: adminId },
      });

      for (const entry of entries) {
        await this.createOutcomeIdempotent(tx, {
          ledgerEntryId: entry.id,
          status,
          source: `stripe`,
          externalId: `admin-refund:${stripeRefundId}:${status}`,
        });
      }
    });
  }

  private async markRefundReversalDenied(params: { ledgerId: string; idempotencyKeyBase: string }) {
    const { ledgerId, idempotencyKeyBase } = params;
    await this.prisma.$transaction(async (tx) => {
      const entries = await tx.ledgerEntryModel.findMany({
        where: {
          ledgerId,
          type: { in: [...PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES] },
        },
        select: { id: true },
      });

      for (const entry of entries) {
        await this.createOutcomeIdempotent(tx, {
          ledgerEntryId: entry.id,
          status: $Enums.TransactionStatus.DENIED,
          source: `stripe`,
          externalId: `admin-refund:${idempotencyKeyBase}:failed`,
        });
      }
    });
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

    if (deriveEffectivePaymentRequestStatus(paymentRequest) !== $Enums.TransactionStatus.COMPLETED) {
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
        getEffectiveLedgerStatus(entry) === $Enums.TransactionStatus.COMPLETED,
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
    const requesterReversalType = getRequesterReversalEntryType({
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

        const alreadyReversed = calculateAlreadyReversedAmount(reversalEntries);
        const findExistingReversal = async (amount: number) => {
          const idempotencyKeyBase = buildAdminPaymentReversalIdempotencyKey({
            paymentRequestId,
            kind: body.kind,
            amount,
            reason: body.reason ?? null,
          });
          const existingReversal = await tx.ledgerEntryModel.findFirst({
            where: { idempotencyKey: `${idempotencyKeyBase}:payer` },
            select: {
              id: true,
              ledgerId: true,
              amount: true,
              stripeId: true,
              status: true,
              outcomes: {
                orderBy: { createdAt: `desc` },
                take: 1,
                select: { status: true },
              },
            },
          });
          return { idempotencyKeyBase, existingReversal };
        };

        let idempotencyKeyBase: string;
        let finalRequestedAmount: number;
        let remainingBefore: number;
        let existingReversal: ExistingReversalRow | null;

        if (requestedAmount != null) {
          const existing = await findExistingReversal(requestedAmount);
          idempotencyKeyBase = existing.idempotencyKeyBase;
          existingReversal = existing.existingReversal;
          finalRequestedAmount = requestedAmount;
          remainingBefore = requestAmount - alreadyReversed;
        } else {
          const amountResolution = resolveStrictReversalAmount({ requestAmount, alreadyReversed });
          if (amountResolution.ok === false) {
            const existing = await findExistingReversal(requestAmount);
            if (existing.existingReversal && this.isReusableExistingReversal(existing.existingReversal)) {
              return {
                ledgerId: existing.existingReversal.ledgerId,
                amount: Number(existing.existingReversal.amount),
                remaining: Math.max(0, requestAmount - alreadyReversed),
                kind: body.kind,
                alreadyExisted: true,
                idempotencyKeyBase: existing.idempotencyKeyBase,
                stripePaymentIntentId,
                existingStripeRefundId: existing.existingReversal.stripeId ?? null,
                needsRefundFinalize:
                  body.kind === `REFUND` && this.shouldFinalizeExistingRefund(existing.existingReversal),
              };
            }
            throw new BadRequestException(adminErrorCodes.ADMIN_PAYMENT_REQUEST_ALREADY_FULLY_REVERSED);
          }
          finalRequestedAmount = amountResolution.finalAmount;
          remainingBefore = amountResolution.remainingBefore;
          const existing = await findExistingReversal(finalRequestedAmount);
          idempotencyKeyBase = existing.idempotencyKeyBase;
          existingReversal = existing.existingReversal;
        }

        if (existingReversal && this.isReusableExistingReversal(existingReversal)) {
          return {
            ledgerId: existingReversal.ledgerId,
            amount: Number(existingReversal.amount),
            remaining: Math.max(0, requestAmount - alreadyReversed),
            kind: body.kind,
            alreadyExisted: true,
            idempotencyKeyBase,
            stripePaymentIntentId,
            existingStripeRefundId: existingReversal.stripeId ?? null,
            needsRefundFinalize: body.kind === `REFUND` && this.shouldFinalizeExistingRefund(existingReversal),
          };
        }

        const amountResolution = resolveStrictReversalAmount({
          requestAmount,
          alreadyReversed,
          requestedAmount,
        });
        if (amountResolution.ok === false) {
          if (amountResolution.reason === `ALREADY_FULLY_REVERSED`) {
            throw new BadRequestException(adminErrorCodes.ADMIN_PAYMENT_REQUEST_ALREADY_FULLY_REVERSED);
          }
          throw new BadRequestException(adminErrorCodes.ADMIN_REVERSAL_AMOUNT_EXCEEDS_REMAINING_BALANCE);
        }
        finalRequestedAmount = amountResolution.finalAmount;
        remainingBefore = amountResolution.remainingBefore;

        const ledgerId = randomUUID();
        const auditAction =
          body.kind === `REFUND`
            ? ADMIN_ACTION_AUDIT_ACTIONS.payment_refund
            : ADMIN_ACTION_AUDIT_ACTIONS.payment_chargeback;
        await this.adminActionAudit.recordRequiredWithClient(tx, {
          adminId,
          action: auditAction,
          resource: `payment_request`,
          resourceId: paymentRequestId,
          metadata: {
            amount: finalRequestedAmount,
            currencyCode: paymentRequest.currencyCode,
            ledgerId,
            idempotencyKeyBase,
          },
        });

        const stripeRefundId: string | null = null;
        let reversalStatus: $Enums.TransactionStatus = $Enums.TransactionStatus.COMPLETED;
        if (body.kind === `REFUND`) {
          if (!stripePaymentIntentId) {
            throw new BadRequestException(adminErrorCodes.ADMIN_STRIPE_PAYMENT_INTENT_NOT_FOUND_FOR_REFUND);
          }
          reversalStatus = $Enums.TransactionStatus.PENDING;
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
          idempotencyKeyBase,
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
          idempotencyKeyBase,
          stripePaymentIntentId,
        };
      });
    };

    let result: ReversalResult;

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

    if (body.kind === `REFUND` && (!result.alreadyExisted || result.needsRefundFinalize === true)) {
      if (!result.idempotencyKeyBase || !result.stripePaymentIntentId) {
        throw new BadRequestException(adminErrorCodes.ADMIN_STRIPE_PAYMENT_INTENT_NOT_FOUND_FOR_REFUND);
      }

      let refundId = result.existingStripeRefundId ?? null;
      let refundStatus: $Enums.TransactionStatus = $Enums.TransactionStatus.PENDING;
      if (refundId) {
        const existingRefund = await this.stripe.refunds.retrieve(refundId);
        refundStatus = this.getRefundTransactionStatus(existingRefund.status);
      } else {
        let refund: Stripe.Response<Stripe.Refund>;
        try {
          const digits = getCurrencyFractionDigits(paymentRequest.currencyCode);
          const amountMinor = Math.round(result.amount * 10 ** digits);
          refund = await this.stripe.refunds.create(
            {
              payment_intent: result.stripePaymentIntentId,
              amount: amountMinor,
              metadata: {
                paymentRequestId,
                adminId,
                reversalKind: body.kind,
                reason: body.reason ?? ``,
                idempotencyKeyBase: result.idempotencyKeyBase,
              },
            },
            { idempotencyKey: `refund:${result.idempotencyKeyBase}` },
          );
        } catch (err) {
          await this.markRefundReversalDenied({
            ledgerId: result.ledgerId,
            idempotencyKeyBase: result.idempotencyKeyBase,
          });
          throw err;
        }

        refundId = refund.id;
        refundStatus = this.getRefundTransactionStatus(refund.status);
      }
      if (!refundId) {
        throw new BadRequestException(adminErrorCodes.ADMIN_STRIPE_PAYMENT_INTENT_NOT_FOUND_FOR_REFUND);
      }
      if (result.alreadyExisted) {
        await this.adminActionAudit.recordRequired({
          adminId,
          action: ADMIN_ACTION_AUDIT_ACTIONS.payment_refund,
          resource: `payment_request`,
          resourceId: paymentRequestId,
          metadata: {
            kind: body.kind,
            amount: result.amount,
            reason: body.reason ?? null,
            idempotencyKeyBase: result.idempotencyKeyBase,
            ledgerId: result.ledgerId,
            stripeRefundId: refundId,
            replayedExistingReversal: true,
          },
        });
      }
      try {
        await this.finalizeRefundReversal({
          ledgerId: result.ledgerId,
          adminId,
          stripeRefundId: refundId,
          status: refundStatus,
        });
      } catch (err) {
        this.logger.error({
          event: `admin_refund_finalize_failed_retrying`,
          paymentRequestId,
          ledgerId: result.ledgerId,
          errorClass: err instanceof Error ? err.name : `UnknownError`,
        });
        await this.finalizeRefundReversal({
          ledgerId: result.ledgerId,
          adminId,
          stripeRefundId: refundId,
          status: refundStatus,
        });
      }
    }

    if (!result.alreadyExisted) {
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
