import { Injectable, Logger } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { AdminV2PaymentReversalNotificationService } from './admin-v2-payment-reversal-notification.service';
import { AdminV2PaymentReversalPolicyProvider } from './admin-v2-payment-reversal-policy';
import { AdminV2PaymentReversalRefundFinalizerService } from './admin-v2-payment-reversal-refund-finalizer.service';
import { AdminV2PaymentReversalRequestPreparerService } from './admin-v2-payment-reversal-request-preparer.service';
import {
  type PaymentReversalExecutionResult,
  AdminV2PaymentReversalWorkflowService,
} from './admin-v2-payment-reversal-workflow.service';
import { type PaymentReversalCreateInput } from './admin-v2-payment-reversal.types';
import { moneyDecimalToNumber } from '../../shared/money-decimal.utils';

@Injectable()
export class AdminV2PaymentReversalService {
  private readonly logger = new Logger(AdminV2PaymentReversalService.name);

  constructor(
    private readonly requestPreparer: AdminV2PaymentReversalRequestPreparerService,
    private readonly workflow: AdminV2PaymentReversalWorkflowService,
    private readonly refundFinalizer: AdminV2PaymentReversalRefundFinalizerService,
    private readonly notificationService: AdminV2PaymentReversalNotificationService,
    private readonly policyProvider: AdminV2PaymentReversalPolicyProvider,
  ) {}

  async createReversal(paymentRequestId: string, body: PaymentReversalCreateInput, adminId: string) {
    const prepared = await this.requestPreparer.prepare(paymentRequestId, body);
    const { paymentRequest } = prepared;
    const executeReversal = () =>
      this.workflow.executeReversal({
        paymentRequestId,
        paymentRequest,
        body,
        adminId,
        requestAmount: prepared.requestAmount,
        requestedAmount: prepared.requestedAmount,
        stripePaymentIntentId: prepared.stripePaymentIntentId,
        originalLedgerId: prepared.originalLedgerId,
        requesterSettlementEntry: prepared.requesterSettlementEntry,
        requesterReversalType: prepared.requesterReversalType,
      });

    let result: PaymentReversalExecutionResult;

    try {
      result = await executeReversal();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
        throw err;
      }
      if (this.policyProvider.get(body.kind).retriesLedgerAppendOnFailure) {
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

    await this.refundFinalizer.finalizeIfNeeded({ paymentRequestId, paymentRequest, body, adminId, result });

    if (!result.alreadyExisted) {
      const resultAmount = moneyDecimalToNumber(result.amount);
      await this.notificationService.sendReversalEmails({
        paymentRequestId,
        payerId: paymentRequest.payerId!,
        requesterId: paymentRequest.requesterId,
        requesterEmail: paymentRequest.requesterEmail,
        amount: resultAmount,
        currencyCode: paymentRequest.currencyCode,
        kind: body.kind,
        reason: body.reason ?? null,
      });
    }

    return {
      ledgerId: result.ledgerId,
      amount: moneyDecimalToNumber(result.amount),
      remaining: moneyDecimalToNumber(result.remaining),
      kind: result.kind,
    };
  }
}
