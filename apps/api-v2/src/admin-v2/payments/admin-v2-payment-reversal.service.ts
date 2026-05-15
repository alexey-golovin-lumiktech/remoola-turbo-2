import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { type TPaymentReversalKind } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';
import { adminErrorCodes } from '@remoola/shared-constants';

import { AdminV2PaymentReversalRefundFinalizerService } from './admin-v2-payment-reversal-refund-finalizer.service';
import {
  type PaymentReversalExecutionResult,
  AdminV2PaymentReversalWorkflowService,
} from './admin-v2-payment-reversal-workflow.service';
import { AdminV2PaymentReversalQuery } from './admin-v2-payment-reversal.query';
import { MailingService } from '../../shared/mailing.service';
import { moneyDecimalToNumber, toPositiveMoneyDecimal } from '../../shared/money-decimal.utils';
import {
  deriveEffectivePaymentRequestStatus,
  getEffectiveLedgerStatus,
  getRequesterReversalEntryType,
} from '../../shared/payment-reversal-calculator';

type PaymentReversalCreateInput = {
  kind: TPaymentReversalKind;
  amount?: number;
  reason?: string;
};

@Injectable()
export class AdminV2PaymentReversalService {
  private readonly logger = new Logger(AdminV2PaymentReversalService.name);

  constructor(
    private readonly query: AdminV2PaymentReversalQuery,
    private readonly workflow: AdminV2PaymentReversalWorkflowService,
    private readonly refundFinalizer: AdminV2PaymentReversalRefundFinalizerService,
    private readonly mailingService: MailingService,
  ) {}

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
    const notificationContext = await this.query.getNotificationContext({
      paymentRequestId,
      payerId,
      requesterId,
      requesterEmail,
    });
    if (!notificationContext.payerEmail) return;

    if (kind === `REFUND`) {
      await this.mailingService.sendPaymentRefundEmail({
        recipientEmail: notificationContext.payerEmail,
        counterpartyEmail: notificationContext.requesterEmailResolved,
        amount,
        currencyCode,
        reason,
        paymentRequestId,
        role: `payer`,
        consumerAppScope: notificationContext.consumerAppScope,
      });
      if (notificationContext.requesterEmailResolved) {
        await this.mailingService.sendPaymentRefundEmail({
          recipientEmail: notificationContext.requesterEmailResolved,
          counterpartyEmail: notificationContext.payerEmail,
          amount,
          currencyCode,
          reason,
          paymentRequestId,
          role: `requester`,
          consumerAppScope: notificationContext.consumerAppScope,
        });
      }
      return;
    }

    await this.mailingService.sendPaymentChargebackEmail({
      recipientEmail: notificationContext.payerEmail,
      counterpartyEmail: notificationContext.requesterEmailResolved,
      amount,
      currencyCode,
      reason,
      paymentRequestId,
      role: `payer`,
      consumerAppScope: notificationContext.consumerAppScope,
    });
    if (notificationContext.requesterEmailResolved) {
      await this.mailingService.sendPaymentChargebackEmail({
        recipientEmail: notificationContext.requesterEmailResolved,
        counterpartyEmail: notificationContext.payerEmail,
        amount,
        currencyCode,
        reason,
        paymentRequestId,
        role: `requester`,
        consumerAppScope: notificationContext.consumerAppScope,
      });
    }
  }

  async createReversal(paymentRequestId: string, body: PaymentReversalCreateInput, adminId: string) {
    const paymentRequest = await this.query.getPaymentRequestForReversal(paymentRequestId);

    if (!paymentRequest) throw new NotFoundException(adminErrorCodes.ADMIN_PAYMENT_REQUEST_NOT_FOUND);

    if (!paymentRequest.payerId) {
      throw new BadRequestException(adminErrorCodes.ADMIN_PAYMENT_REQUEST_NOT_FOUND);
    }

    if (deriveEffectivePaymentRequestStatus(paymentRequest) !== $Enums.TransactionStatus.COMPLETED) {
      throw new BadRequestException(adminErrorCodes.ADMIN_ONLY_COMPLETED_CAN_BE_REVERSED);
    }

    let requestAmount: Prisma.Decimal;
    try {
      requestAmount = toPositiveMoneyDecimal(paymentRequest.amount, `payment request amount`);
    } catch {
      throw new BadRequestException(adminErrorCodes.ADMIN_INVALID_PAYMENT_AMOUNT);
    }

    let requestedAmount: Prisma.Decimal | undefined;
    if (body.amount != null) {
      try {
        requestedAmount = toPositiveMoneyDecimal(body.amount, `reversal amount`);
      } catch {
        throw new BadRequestException(adminErrorCodes.ADMIN_INVALID_REVERSAL_AMOUNT);
      }
    }

    const originalLedgerId = paymentRequest.ledgerEntries.find(
      (entry) =>
        entry.type === $Enums.LedgerEntryType.USER_PAYMENT &&
        getEffectiveLedgerStatus(entry) === $Enums.TransactionStatus.COMPLETED,
    )?.ledgerId;

    const stripePaymentIntentId = await this.query.resolveStripePaymentIntentId(paymentRequestId);
    const requesterSettlementEntry = paymentRequest.requesterId
      ? await this.query.getRequesterSettlementEntry(paymentRequestId, paymentRequest.requesterId)
      : null;
    const requesterReversalType = getRequesterReversalEntryType({
      settlementEntryType: requesterSettlementEntry?.type,
      paymentRail: requesterSettlementEntry?.paymentRequest?.paymentRail ?? null,
    });
    const executeReversal = () =>
      this.workflow.executeReversal({
        paymentRequestId,
        paymentRequest,
        body,
        adminId,
        requestAmount,
        requestedAmount,
        stripePaymentIntentId,
        originalLedgerId: originalLedgerId ?? null,
        requesterSettlementEntry,
        requesterReversalType,
      });

    let result: PaymentReversalExecutionResult;

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

    await this.refundFinalizer.finalizeIfNeeded({ paymentRequestId, paymentRequest, body, adminId, result });

    if (!result.alreadyExisted) {
      const resultAmount = moneyDecimalToNumber(result.amount);
      await this.sendReversalEmails({
        paymentRequestId,
        payerId: paymentRequest.payerId,
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
