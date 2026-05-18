import { BadRequestException, Inject, Injectable, Logger } from '@nestjs/common';
import Stripe from 'stripe';

import { $Enums } from '@remoola/database-2';
import { adminErrorCodes } from '@remoola/shared-constants';

import {
  PAYMENT_REVERSAL_AUDIT_PORT,
  PAYMENT_REVERSAL_LEDGER_FINALIZATION_PORT,
  PAYMENT_REVERSAL_LEDGER_TRANSACTION_PORT,
  PAYMENT_REVERSAL_REFUND_OUTBOX_PORT,
  PAYMENT_REVERSAL_STRIPE_REFUND_PORT,
  type PaymentReversalAuditPort,
  type PaymentReversalLedgerFinalizationPort,
  type PaymentReversalLedgerTransactionPort,
  type PaymentReversalRefundOutboxPort,
  type PaymentReversalStripeRefundPort,
} from './admin-v2-payment-reversal-refund-finalizer.ports';
import {
  buildAdminRefundFinalizationOutboxIdempotencyKey,
  type AdminRefundFinalizationOutboxPayload,
} from './admin-v2-payment-reversal-refund-outbox';
import { type PaymentReversalExecutionResult } from './admin-v2-payment-reversal-workflow.service';
import { type PaymentReversalPaymentRequest } from './admin-v2-payment-reversal.query';
import { type PaymentReversalCreateInput } from './admin-v2-payment-reversal.types';
import { ADMIN_ACTION_AUDIT_ACTIONS } from '../../shared/admin-action-audit.service';
import { moneyDecimalToNumber, moneyDecimalToStripeMinorUnits } from '../../shared/money-decimal.utils';

@Injectable()
export class AdminV2PaymentReversalRefundFinalizerService {
  private readonly logger = new Logger(AdminV2PaymentReversalRefundFinalizerService.name);

  constructor(
    @Inject(PAYMENT_REVERSAL_LEDGER_FINALIZATION_PORT)
    private readonly repository: PaymentReversalLedgerFinalizationPort,
    @Inject(PAYMENT_REVERSAL_REFUND_OUTBOX_PORT)
    private readonly outboxRepository: PaymentReversalRefundOutboxPort,
    @Inject(PAYMENT_REVERSAL_AUDIT_PORT)
    private readonly adminActionAudit: PaymentReversalAuditPort,
    @Inject(PAYMENT_REVERSAL_LEDGER_TRANSACTION_PORT)
    private readonly transactions: PaymentReversalLedgerTransactionPort,
    @Inject(PAYMENT_REVERSAL_STRIPE_REFUND_PORT)
    private readonly stripe: PaymentReversalStripeRefundPort,
  ) {}

  async finalizeIfNeeded(params: {
    paymentRequestId: string;
    paymentRequest: PaymentReversalPaymentRequest;
    body: PaymentReversalCreateInput;
    adminId: string;
    result: PaymentReversalExecutionResult;
  }) {
    const { paymentRequestId, paymentRequest, body, adminId, result } = params;
    if (body.kind !== `REFUND` || (result.alreadyExisted && result.needsRefundFinalize !== true)) {
      return;
    }

    if (!result.idempotencyKeyBase || !result.stripePaymentIntentId) {
      throw new BadRequestException(adminErrorCodes.ADMIN_STRIPE_PAYMENT_INTENT_NOT_FOUND_FOR_REFUND);
    }

    const payload: AdminRefundFinalizationOutboxPayload = {
      paymentRequestId,
      ledgerId: result.ledgerId,
      adminId,
      stripePaymentIntentId: result.stripePaymentIntentId,
      idempotencyKeyBase: result.idempotencyKeyBase,
      existingStripeRefundId: result.existingStripeRefundId ?? null,
      amount: result.amount.toString(),
      currencyCode: paymentRequest.currencyCode,
      reason: body.reason ?? null,
    };
    await this.outboxRepository.queuePending(payload);

    const outboxKey = buildAdminRefundFinalizationOutboxIdempotencyKey(payload.idempotencyKeyBase);
    try {
      const stripeRefundId = await this.finalizePayload(payload, { markLedgerDeniedOnStripeCreateFailure: true });
      if (result.alreadyExisted) {
        await this.auditReplayedExistingRefund({ paymentRequestId, adminId, body, result, stripeRefundId });
      }
      await this.outboxRepository.markSentByIdempotencyKey(outboxKey);
    } catch (error) {
      await this.outboxRepository.markFailedByIdempotencyKey(outboxKey, error);
      throw error;
    }
  }

  async finalizeQueuedPayload(payload: AdminRefundFinalizationOutboxPayload) {
    await this.finalizePayload(payload, { markLedgerDeniedOnStripeCreateFailure: false });
  }

  private async finalizePayload(
    payload: AdminRefundFinalizationOutboxPayload,
    options: { markLedgerDeniedOnStripeCreateFailure: boolean },
  ): Promise<string> {
    let refundId = payload.existingStripeRefundId ?? null;
    let refundStatus: $Enums.TransactionStatus = $Enums.TransactionStatus.PENDING;
    if (refundId) {
      const existingRefund = await this.stripe.refunds.retrieve(refundId);
      refundStatus = this.getRefundTransactionStatus(existingRefund.status);
    } else {
      let refund: Stripe.Response<Stripe.Refund>;
      try {
        const amountMinor = moneyDecimalToStripeMinorUnits(payload.amount, payload.currencyCode);
        refund = await this.stripe.refunds.create(
          {
            payment_intent: payload.stripePaymentIntentId,
            amount: amountMinor,
            metadata: {
              paymentRequestId: payload.paymentRequestId,
              adminId: payload.adminId,
              reversalKind: `REFUND`,
              reason: payload.reason ?? ``,
              idempotencyKeyBase: payload.idempotencyKeyBase,
            },
          },
          { idempotencyKey: `refund:${payload.idempotencyKeyBase}` },
        );
      } catch (err) {
        if (options.markLedgerDeniedOnStripeCreateFailure) {
          await this.transactions.runLedgerMutation((tx) =>
            this.repository.markRefundReversalDenied(tx, {
              ledgerId: payload.ledgerId,
              idempotencyKeyBase: payload.idempotencyKeyBase,
            }),
          );
          await this.outboxRepository.markDeadByIdempotencyKey(
            buildAdminRefundFinalizationOutboxIdempotencyKey(payload.idempotencyKeyBase),
            err,
          );
        }
        throw err;
      }

      refundId = refund.id;
      refundStatus = this.getRefundTransactionStatus(refund.status);
    }
    if (!refundId) {
      throw new BadRequestException(adminErrorCodes.ADMIN_STRIPE_PAYMENT_INTENT_NOT_FOUND_FOR_REFUND);
    }
    try {
      await this.transactions.runLedgerMutation((tx) =>
        this.repository.finalizeRefundReversal(tx, {
          ledgerId: payload.ledgerId,
          adminId: payload.adminId,
          stripeRefundId: refundId,
          status: refundStatus,
        }),
      );
    } catch (err) {
      this.logger.error({
        event: `admin_refund_finalize_failed_retrying`,
        paymentRequestId: payload.paymentRequestId,
        ledgerId: payload.ledgerId,
        errorClass: err instanceof Error ? err.name : `UnknownError`,
      });
      await this.transactions.runLedgerMutation((tx) =>
        this.repository.finalizeRefundReversal(tx, {
          ledgerId: payload.ledgerId,
          adminId: payload.adminId,
          stripeRefundId: refundId,
          status: refundStatus,
        }),
      );
    }

    return refundId;
  }

  async auditReplayedExistingRefund(params: {
    paymentRequestId: string;
    adminId: string;
    body: PaymentReversalCreateInput;
    result: PaymentReversalExecutionResult;
    stripeRefundId: string;
  }) {
    await this.adminActionAudit.recordRequired({
      adminId: params.adminId,
      action: ADMIN_ACTION_AUDIT_ACTIONS.payment_refund,
      resource: `payment_request`,
      resourceId: params.paymentRequestId,
      metadata: {
        kind: params.body.kind,
        amount: moneyDecimalToNumber(params.result.amount),
        reason: params.body.reason ?? null,
        idempotencyKeyBase: params.result.idempotencyKeyBase,
        ledgerId: params.result.ledgerId,
        stripeRefundId: params.stripeRefundId,
        replayedExistingReversal: true,
      },
    });
  }

  private getRefundTransactionStatus(
    stripeStatus: Stripe.Refund[`status`] | null | undefined,
  ): $Enums.TransactionStatus {
    return stripeStatus && stripeStatus !== `succeeded`
      ? $Enums.TransactionStatus.PENDING
      : $Enums.TransactionStatus.COMPLETED;
  }
}
