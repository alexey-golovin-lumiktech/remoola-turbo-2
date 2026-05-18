import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { type TPaymentReversalKind } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';
import { adminErrorCodes } from '@remoola/shared-constants';

import {
  type PaymentReversalPaymentRequest,
  type PaymentReversalRequesterSettlementEntry,
  AdminV2PaymentReversalQuery,
} from './admin-v2-payment-reversal.query';
import { moneyDecimalToNumber, toPositiveMoneyDecimal } from '../../shared/money-decimal.utils';
import {
  deriveEffectivePaymentRequestStatus,
  getEffectiveLedgerStatus,
  getRequesterReversalEntryType,
} from '../../shared/payment-reversal-calculator';

export type PaymentReversalCreateInput = {
  kind: TPaymentReversalKind;
  amount?: number;
  reason?: string;
};

type PreparedPaymentReversal = {
  paymentRequest: PaymentReversalPaymentRequest;
  requestAmount: Prisma.Decimal;
  requestedAmount?: Prisma.Decimal;
  stripePaymentIntentId: string | null;
  originalLedgerId: string | null;
  requesterSettlementEntry: PaymentReversalRequesterSettlementEntry | null;
  requesterReversalType: $Enums.LedgerEntryType;
};

@Injectable()
export class AdminV2PaymentReversalRequestPreparerService {
  constructor(private readonly query: AdminV2PaymentReversalQuery) {}

  async prepare(paymentRequestId: string, body: PaymentReversalCreateInput): Promise<PreparedPaymentReversal> {
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

    const originalLedgerId =
      paymentRequest.ledgerEntries.find(
        (entry) =>
          entry.type === $Enums.LedgerEntryType.USER_PAYMENT &&
          getEffectiveLedgerStatus(entry) === $Enums.TransactionStatus.COMPLETED,
      )?.ledgerId ?? null;

    const stripePaymentIntentId = await this.query.resolveStripePaymentIntentId(paymentRequestId);
    const requesterSettlementEntry = paymentRequest.requesterId
      ? await this.query.getRequesterSettlementEntry(paymentRequestId, paymentRequest.requesterId)
      : null;
    const requesterReversalType = getRequesterReversalEntryType({
      settlementEntryType: requesterSettlementEntry?.type,
      paymentRail: requesterSettlementEntry?.paymentRequest?.paymentRail ?? null,
    });

    return {
      paymentRequest,
      requestAmount,
      requestedAmount,
      stripePaymentIntentId,
      originalLedgerId,
      requesterSettlementEntry,
      requesterReversalType,
    };
  }

  toResponseAmount(amount: Prisma.Decimal): number {
    return moneyDecimalToNumber(amount);
  }
}
