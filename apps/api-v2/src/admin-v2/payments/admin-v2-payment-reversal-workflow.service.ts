import { BadRequestException, Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { newUuid } from '@remoola/security-utils';
import { adminErrorCodes, errorCodes } from '@remoola/shared-constants';

import { AdminV2PaymentReversalPolicyProvider } from './admin-v2-payment-reversal-policy';
import {
  type PaymentReversalPaymentRequest,
  type PaymentReversalRequesterSettlementEntry,
} from './admin-v2-payment-reversal.query';
import { AdminV2PaymentReversalRepository, type ExistingReversalRow } from './admin-v2-payment-reversal.repository';
import { type PaymentReversalCreateInput } from './admin-v2-payment-reversal.types';
import { AdminActionAuditService } from '../../shared/admin-action-audit.service';
import { BalanceCalculationMode, BalanceCalculationService } from '../../shared/balance-calculation.service';
import { toMoneyDecimal, type MoneyDecimalInput } from '../../shared/money-decimal.utils';
import {
  buildAdminPaymentReversalIdempotencyKey,
  calculateAlreadyReversedDecimalAmount,
  resolveStrictReversalDecimalAmount,
} from '../../shared/payment-reversal-calculator';
import {
  acquireTransactionAdvisoryLock,
  buildConsumerOperationLockName,
  buildConsumerOutgoingBalanceLockName,
  buildPaymentRequestOperationLockName,
} from '../../shared/prisma-advisory-locks';
import { PrismaTransactionRunner } from '../../shared/prisma-transaction.runner';
import { getEffectiveLedgerStatus } from '../../shared/transaction-status.utils';

export type PaymentReversalExecutionResult = {
  ledgerId: string;
  amount: Prisma.Decimal;
  remaining: Prisma.Decimal;
  kind: PaymentReversalCreateInput[`kind`];
  alreadyExisted: boolean;
  idempotencyKeyBase?: string;
  stripePaymentIntentId?: string | null;
  existingStripeRefundId?: string | null;
  needsRefundFinalize?: boolean;
};

@Injectable()
export class AdminV2PaymentReversalWorkflowService {
  constructor(
    private readonly transactions: PrismaTransactionRunner,
    private readonly repository: AdminV2PaymentReversalRepository,
    private readonly balanceService: BalanceCalculationService,
    private readonly adminActionAudit: AdminActionAuditService,
    private readonly policyProvider: AdminV2PaymentReversalPolicyProvider,
  ) {}

  private getExistingReversalStatus(existingReversal: ExistingReversalRow): $Enums.TransactionStatus | null {
    if (!existingReversal.status) {
      return null;
    }
    return getEffectiveLedgerStatus(existingReversal as Required<Pick<ExistingReversalRow, `status`>>);
  }

  private isReusableExistingReversal(existingReversal: ExistingReversalRow): boolean {
    const status = this.getExistingReversalStatus(existingReversal);
    return (
      status === $Enums.TransactionStatus.COMPLETED ||
      status === $Enums.TransactionStatus.PENDING ||
      status === $Enums.TransactionStatus.DENIED
    );
  }

  async executeReversal(params: {
    paymentRequestId: string;
    paymentRequest: PaymentReversalPaymentRequest;
    body: PaymentReversalCreateInput;
    adminId: string;
    requestAmount: MoneyDecimalInput;
    requestedAmount?: MoneyDecimalInput;
    stripePaymentIntentId: string | null;
    originalLedgerId: string | null;
    requesterSettlementEntry: PaymentReversalRequesterSettlementEntry | null;
    requesterReversalType: $Enums.LedgerEntryType;
  }): Promise<PaymentReversalExecutionResult> {
    const {
      paymentRequestId,
      paymentRequest,
      body,
      adminId,
      requestAmount,
      requestedAmount,
      stripePaymentIntentId,
      originalLedgerId,
      requesterSettlementEntry,
      requesterReversalType,
    } = params;
    const policy = this.policyProvider.get(body.kind);

    return this.transactions.runLedgerMutation(async (tx) => {
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

      const requestAmountDecimal = toMoneyDecimal(requestAmount, `requestAmount`);
      const reversalEntries = await this.repository.findReversalEntriesForPaymentRequest(tx, paymentRequestId);
      const alreadyReversed = calculateAlreadyReversedDecimalAmount(reversalEntries);
      const findExistingReversal = async (amount: Prisma.Decimal) => {
        const idempotencyKeyBase = buildAdminPaymentReversalIdempotencyKey({
          paymentRequestId,
          kind: body.kind,
          amount,
          reason: body.reason ?? null,
        });
        const existingReversal = await this.repository.findPayerReversalByIdempotencyKey(
          tx,
          `${idempotencyKeyBase}:payer`,
        );
        return { idempotencyKeyBase, existingReversal };
      };

      let idempotencyKeyBase: string;
      let finalRequestedAmount: Prisma.Decimal;
      let remainingBefore: Prisma.Decimal;
      let existingReversal: ExistingReversalRow | null;

      if (requestedAmount != null) {
        const requestedAmountDecimal = toMoneyDecimal(requestedAmount, `requestedAmount`);
        const existing = await findExistingReversal(requestedAmountDecimal);
        idempotencyKeyBase = existing.idempotencyKeyBase;
        existingReversal = existing.existingReversal;
        finalRequestedAmount = requestedAmountDecimal;
        remainingBefore = requestAmountDecimal.minus(alreadyReversed);
      } else {
        const amountResolution = resolveStrictReversalDecimalAmount({
          requestAmount: requestAmountDecimal,
          alreadyReversed,
        });
        if (amountResolution.ok === false) {
          const existing = await findExistingReversal(requestAmountDecimal);
          if (existing.existingReversal && this.isReusableExistingReversal(existing.existingReversal)) {
            const needsRefundFinalize = policy.shouldFinalizeExistingStatus(
              this.getExistingReversalStatus(existing.existingReversal),
            );
            if (needsRefundFinalize && stripePaymentIntentId) {
              await this.repository.queueRefundFinalization(tx, {
                paymentRequestId,
                ledgerId: existing.existingReversal.ledgerId,
                adminId,
                stripePaymentIntentId,
                idempotencyKeyBase: existing.idempotencyKeyBase,
                existingStripeRefundId: existing.existingReversal.stripeId ?? null,
                amount: toMoneyDecimal(existing.existingReversal.amount).toString(),
                currencyCode: paymentRequest.currencyCode,
                reason: body.reason ?? null,
              });
            }
            return {
              ledgerId: existing.existingReversal.ledgerId,
              amount: toMoneyDecimal(existing.existingReversal.amount),
              remaining: requestAmountDecimal.minus(alreadyReversed).gt(0)
                ? requestAmountDecimal.minus(alreadyReversed)
                : new Prisma.Decimal(0),
              kind: body.kind,
              alreadyExisted: true,
              idempotencyKeyBase: existing.idempotencyKeyBase,
              stripePaymentIntentId,
              existingStripeRefundId: existing.existingReversal.stripeId ?? null,
              needsRefundFinalize,
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
        const needsRefundFinalize = policy.shouldFinalizeExistingStatus(
          this.getExistingReversalStatus(existingReversal),
        );
        if (needsRefundFinalize && stripePaymentIntentId) {
          await this.repository.queueRefundFinalization(tx, {
            paymentRequestId,
            ledgerId: existingReversal.ledgerId,
            adminId,
            stripePaymentIntentId,
            idempotencyKeyBase,
            existingStripeRefundId: existingReversal.stripeId ?? null,
            amount: toMoneyDecimal(existingReversal.amount).toString(),
            currencyCode: paymentRequest.currencyCode,
            reason: body.reason ?? null,
          });
        }
        return {
          ledgerId: existingReversal.ledgerId,
          amount: toMoneyDecimal(existingReversal.amount),
          remaining: requestAmountDecimal.minus(alreadyReversed).gt(0)
            ? requestAmountDecimal.minus(alreadyReversed)
            : new Prisma.Decimal(0),
          kind: body.kind,
          alreadyExisted: true,
          idempotencyKeyBase,
          stripePaymentIntentId,
          existingStripeRefundId: existingReversal.stripeId ?? null,
          needsRefundFinalize,
        };
      }

      const amountResolution = resolveStrictReversalDecimalAmount({
        requestAmount: requestAmountDecimal,
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

      const ledgerId = newUuid();
      await this.adminActionAudit.recordRequiredWithClient(tx, {
        adminId,
        action: policy.auditAction,
        resource: `payment_request`,
        resourceId: paymentRequestId,
        metadata: {
          amount: finalRequestedAmount.toString(),
          currencyCode: paymentRequest.currencyCode,
          ledgerId,
          idempotencyKeyBase,
        },
      });

      const stripeRefundId: string | null = null;
      const reversalStatus = policy.initialLedgerStatus;
      if (policy.requiresStripePaymentIntent) {
        if (!stripePaymentIntentId) {
          throw new BadRequestException(adminErrorCodes.ADMIN_STRIPE_PAYMENT_INTENT_NOT_FOUND_FOR_REFUND);
        }
      } else if (policy.requiresRequesterBalanceCheck && paymentRequest.requesterId) {
        const requesterBalance = await this.balanceService.calculateInTransaction(
          tx,
          paymentRequest.requesterId,
          paymentRequest.currencyCode,
          { mode: BalanceCalculationMode.COMPLETED_AND_PENDING },
        );
        if (toMoneyDecimal(requesterBalance, `requesterBalance`).lt(finalRequestedAmount)) {
          throw new BadRequestException(errorCodes.INSUFFICIENT_REQUESTER_BALANCE_REVERSAL_ADMIN);
        }
      }

      const baseMetadata = {
        rail: policy.paymentRail,
        reversalKind: body.kind,
        source: `admin`,
        stripeObjectType: policy.stripeObjectType,
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

      await this.repository.createReversalEntry(tx, {
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
      });

      if (paymentRequest.requesterId) {
        await this.repository.createReversalEntry(tx, {
          ledgerId,
          consumerId: paymentRequest.requesterId,
          paymentRequestId,
          type: requesterReversalType,
          currencyCode: paymentRequest.currencyCode,
          status: reversalStatus,
          amount: finalRequestedAmount.negated(),
          createdBy: adminId,
          updatedBy: adminId,
          metadata: requesterMetadata,
          idempotencyKey: `${idempotencyKeyBase}:requester`,
          stripeId: stripeRefundId ?? undefined,
        });
      }

      if (policy.queuesRefundFinalization && stripePaymentIntentId) {
        await this.repository.queueRefundFinalization(tx, {
          paymentRequestId,
          ledgerId,
          adminId,
          stripePaymentIntentId,
          idempotencyKeyBase,
          existingStripeRefundId: null,
          amount: finalRequestedAmount.toString(),
          currencyCode: paymentRequest.currencyCode,
          reason: body.reason ?? null,
        });
      }

      return {
        ledgerId,
        amount: finalRequestedAmount,
        remaining: remainingBefore.minus(finalRequestedAmount),
        kind: body.kind,
        alreadyExisted: false,
        idempotencyKeyBase,
        stripePaymentIntentId,
      };
    });
  }
}
