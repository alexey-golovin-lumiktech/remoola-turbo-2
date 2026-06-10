import { BadRequestException, Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';
import { newUuid } from '@remoola/security-utils';
import { adminErrorCodes, errorCodes } from '@remoola/shared-constants';

import { AdminV2PaymentReversalPolicyProvider } from './admin-v2-payment-reversal-policy';
import {
  buildExistingReversalResult,
  buildPayerReversalCreateInput,
  buildRefundFinalizationPayload,
  buildRequesterReversalCreateInput,
  buildReversalBaseMetadata,
  getExistingReversalStatus,
  isReusableExistingReversal,
} from './admin-v2-payment-reversal-workflow.helpers';
import {
  type PaymentReversalPaymentRequest,
  type PaymentReversalRequesterSettlementEntry,
} from './admin-v2-payment-reversal.query';
import { AdminV2PaymentReversalRepository } from './admin-v2-payment-reversal.repository';
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
      const reuseExistingReversal = async (params: {
        existingReversal: NonNullable<Awaited<ReturnType<typeof findExistingReversal>>[`existingReversal`]>;
        idempotencyKeyBase: string;
      }) => {
        const existingStatus = getExistingReversalStatus(params.existingReversal);
        const needsRefundFinalize = policy.shouldFinalizeExistingStatus(existingStatus);
        if (needsRefundFinalize && stripePaymentIntentId) {
          await this.repository.queueRefundFinalization(
            tx,
            buildRefundFinalizationPayload({
              paymentRequestId,
              ledgerId: params.existingReversal.ledgerId,
              adminId,
              stripePaymentIntentId,
              idempotencyKeyBase: params.idempotencyKeyBase,
              existingStripeRefundId: params.existingReversal.stripeId ?? null,
              amount: params.existingReversal.amount,
              currencyCode: paymentRequest.currencyCode,
              reason: body.reason ?? null,
            }),
          );
        }

        return buildExistingReversalResult({
          existingReversal: params.existingReversal,
          requestAmount: requestAmountDecimal,
          alreadyReversed,
          kind: body.kind,
          idempotencyKeyBase: params.idempotencyKeyBase,
          stripePaymentIntentId,
          needsRefundFinalize,
        });
      };

      let idempotencyKeyBase: string;
      let finalRequestedAmount: Prisma.Decimal;
      let remainingBefore: Prisma.Decimal;
      let existingReversal: Awaited<ReturnType<typeof findExistingReversal>>[`existingReversal`];

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
          if (existing.existingReversal && isReusableExistingReversal(existing.existingReversal)) {
            return reuseExistingReversal(existing);
          }
          throw new BadRequestException(adminErrorCodes.ADMIN_PAYMENT_REQUEST_ALREADY_FULLY_REVERSED);
        }
        finalRequestedAmount = amountResolution.finalAmount;
        remainingBefore = amountResolution.remainingBefore;
        const existing = await findExistingReversal(finalRequestedAmount);
        idempotencyKeyBase = existing.idempotencyKeyBase;
        existingReversal = existing.existingReversal;
      }

      if (existingReversal && isReusableExistingReversal(existingReversal)) {
        return reuseExistingReversal({ existingReversal, idempotencyKeyBase });
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

      const baseMetadata = buildReversalBaseMetadata({
        paymentRail: policy.paymentRail,
        kind: body.kind,
        stripeObjectType: policy.stripeObjectType,
        reason: body.reason ?? null,
        stripePaymentIntentId,
        stripeRefundId,
        idempotencyKeyBase,
      });

      await this.repository.createReversalEntry(
        tx,
        buildPayerReversalCreateInput({
          ledgerId,
          paymentRequestId,
          payerId: paymentRequest.payerId,
          currencyCode: paymentRequest.currencyCode,
          status: reversalStatus,
          amount: finalRequestedAmount,
          adminId,
          baseMetadata,
          originalLedgerId: originalLedgerId ?? null,
          idempotencyKeyBase,
          stripeRefundId,
        }),
      );

      if (paymentRequest.requesterId) {
        await this.repository.createReversalEntry(
          tx,
          buildRequesterReversalCreateInput({
            ledgerId,
            paymentRequestId,
            requesterId: paymentRequest.requesterId,
            requesterReversalType,
            currencyCode: paymentRequest.currencyCode,
            status: reversalStatus,
            amount: finalRequestedAmount,
            adminId,
            baseMetadata,
            requesterSettlementLedgerId: requesterSettlementEntry?.ledgerId ?? null,
            idempotencyKeyBase,
            stripeRefundId,
          }),
        );
      }

      if (policy.queuesRefundFinalization && stripePaymentIntentId) {
        await this.repository.queueRefundFinalization(
          tx,
          buildRefundFinalizationPayload({
            paymentRequestId,
            ledgerId,
            adminId,
            stripePaymentIntentId,
            idempotencyKeyBase,
            existingStripeRefundId: null,
            amount: finalRequestedAmount,
            currencyCode: paymentRequest.currencyCode,
            reason: body.reason ?? null,
          }),
        );
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
