import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { type ConsumerAppScope } from '@remoola/api-types';
import { $Enums, type Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { type CreatePaymentRequest } from './dto';
import { appendConsumerAppScopeToMetadata } from '../../../shared/payment-link-metadata';
import { PrismaService } from '../../../shared/prisma.service';

type PaymentRequestTx = Pick<Prisma.TransactionClient, `ledgerEntryModel` | `paymentRequestModel`>;

@Injectable()
export class ConsumerPaymentRequestRepository {
  constructor(private readonly prisma: PrismaService) {}

  createDraftPaymentRequest(params: {
    consumerId: string;
    normalizedEmail: string;
    recipient: { id: string; email: string | null } | null;
    body: CreatePaymentRequest;
    dueDate: Date | null;
  }) {
    return this.prisma.paymentRequestModel.create({
      data: {
        payerId: params.recipient?.id ?? null,
        payerEmail: params.recipient?.email ?? params.normalizedEmail,
        requesterId: params.consumerId,
        currencyCode: params.body.currencyCode ?? $Enums.CurrencyCode.USD,
        amount: Number(params.body.amount),
        description: params.body.description ?? null,
        dueDate: params.dueDate,
        status: $Enums.TransactionStatus.DRAFT,
        createdBy: params.consumerId,
        updatedBy: params.consumerId,
      },
    });
  }

  async createPendingStartPayment(
    tx: PaymentRequestTx,
    params: {
      ledgerId: string;
      consumerId: string;
      normalizedEmail: string;
      recipient: { id: string; email: string | null } | null;
      paymentCurrency: $Enums.CurrencyCode;
      paymentRail: $Enums.PaymentRail;
      amount: number;
      description?: string | null;
      payerMetadata: Prisma.InputJsonValue;
      requesterMetadata: Prisma.InputJsonValue;
      requesterEntryType: $Enums.LedgerEntryType;
    },
  ) {
    const paymentRequest = await tx.paymentRequestModel.create({
      data: {
        payerId: params.consumerId,
        requesterId: params.recipient?.id ?? null,
        requesterEmail: params.recipient?.email ?? params.normalizedEmail,
        currencyCode: params.paymentCurrency,
        paymentRail: params.paymentRail,
        amount: params.amount,
        description: params.description ?? null,
        status: $Enums.TransactionStatus.PENDING,
        createdBy: params.consumerId,
        updatedBy: params.consumerId,
      },
    });

    await tx.ledgerEntryModel.create({
      data: {
        ledgerId: params.ledgerId,
        consumerId: params.consumerId,
        paymentRequestId: paymentRequest.id,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        currencyCode: params.paymentCurrency,
        status: $Enums.TransactionStatus.PENDING,
        amount: -params.amount,
        createdBy: params.consumerId,
        updatedBy: params.consumerId,
        idempotencyKey: `pr:${paymentRequest.id}:payer`,
        metadata: params.payerMetadata,
      },
    });

    if (params.recipient) {
      await tx.ledgerEntryModel.create({
        data: {
          ledgerId: params.ledgerId,
          consumerId: params.recipient.id,
          paymentRequestId: paymentRequest.id,
          type: params.requesterEntryType,
          currencyCode: params.paymentCurrency,
          status: $Enums.TransactionStatus.PENDING,
          amount: params.amount,
          createdBy: params.consumerId,
          updatedBy: params.consumerId,
          idempotencyKey: `pr:${paymentRequest.id}:requester`,
          metadata: params.requesterMetadata,
        },
      });
    }

    return paymentRequest;
  }

  async sendDraftPaymentRequest(
    tx: PaymentRequestTx,
    params: {
      consumerId: string;
      paymentRequestId: string;
      ledgerId: string;
      consumerAppScope?: ConsumerAppScope;
    },
  ) {
    const paymentRequest = await tx.paymentRequestModel.findUnique({
      where: { id: params.paymentRequestId },
      select: {
        id: true,
        requesterId: true,
        requesterEmail: true,
        payerId: true,
        payerEmail: true,
        status: true,
        amount: true,
        currencyCode: true,
        description: true,
        dueDate: true,
        payer: { select: { email: true } },
        requester: { select: { email: true } },
        _count: { select: { ledgerEntries: true } },
      },
    });

    if (!paymentRequest) {
      throw new NotFoundException(errorCodes.PAYMENT_REQUEST_NOT_FOUND_SEND_DRAFT);
    }
    if (paymentRequest.requesterId !== params.consumerId) {
      throw new ForbiddenException(errorCodes.PAYMENT_ACCESS_DENIED_SEND_DRAFT);
    }
    if (paymentRequest.status !== $Enums.TransactionStatus.DRAFT) {
      throw new BadRequestException(errorCodes.ONLY_DRAFT_REQUESTS_CAN_BE_SENT);
    }

    const amount = Number(paymentRequest.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_SEND_DRAFT);
    }

    const transition = await tx.paymentRequestModel.updateMany({
      where: {
        id: params.paymentRequestId,
        requesterId: params.consumerId,
        status: $Enums.TransactionStatus.DRAFT,
      },
      data: {
        status: $Enums.TransactionStatus.PENDING,
        sentDate: new Date(),
        updatedBy: params.consumerId,
      },
    });

    if (transition.count === 0) {
      const current = await tx.paymentRequestModel.findUnique({
        where: { id: params.paymentRequestId },
        select: {
          id: true,
          requesterId: true,
          status: true,
        },
      });

      if (!current) {
        throw new NotFoundException(errorCodes.PAYMENT_REQUEST_NOT_FOUND_SEND_DRAFT);
      }
      if (current.requesterId !== params.consumerId) {
        throw new ForbiddenException(errorCodes.PAYMENT_ACCESS_DENIED_SEND_DRAFT);
      }
      throw new BadRequestException(errorCodes.ONLY_DRAFT_REQUESTS_CAN_BE_SENT);
    }

    if (!paymentRequest.payerId && paymentRequest._count.ledgerEntries > 0) {
      throw new BadRequestException(errorCodes.INVALID_LEDGER_STATE_EMAIL_PAYMENT_SEND);
    }
    if (paymentRequest.payerId && paymentRequest._count.ledgerEntries > 0) {
      throw new BadRequestException(errorCodes.INVALID_LEDGER_STATE_DRAFT);
    }

    if (paymentRequest._count.ledgerEntries === 0 && paymentRequest.payerId && paymentRequest.requesterId) {
      await tx.ledgerEntryModel.create({
        data: {
          ledgerId: params.ledgerId,
          consumerId: paymentRequest.payerId,
          paymentRequestId: paymentRequest.id,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          currencyCode: paymentRequest.currencyCode,
          status: $Enums.TransactionStatus.PENDING,
          amount: -amount,
          createdBy: params.consumerId,
          updatedBy: params.consumerId,
          idempotencyKey: `pr:${paymentRequest.id}:payer`,
          metadata: appendConsumerAppScopeToMetadata(
            {
              counterpartyId: paymentRequest.requesterId,
            },
            params.consumerAppScope,
          ),
        },
      });

      await tx.ledgerEntryModel.create({
        data: {
          ledgerId: params.ledgerId,
          consumerId: paymentRequest.requesterId,
          paymentRequestId: paymentRequest.id,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          currencyCode: paymentRequest.currencyCode,
          status: $Enums.TransactionStatus.PENDING,
          amount,
          createdBy: params.consumerId,
          updatedBy: params.consumerId,
          idempotencyKey: `pr:${paymentRequest.id}:requester`,
          metadata: appendConsumerAppScopeToMetadata(
            {
              counterpartyId: paymentRequest.payerId,
            },
            params.consumerAppScope,
          ),
        },
      });
    }

    return {
      paymentRequestId: paymentRequest.id,
      email: {
        payerEmail: paymentRequest.payer?.email ?? paymentRequest.payerEmail ?? ``,
        requesterEmail: paymentRequest.requester?.email ?? paymentRequest.requesterEmail ?? ``,
        amount,
        currencyCode: paymentRequest.currencyCode,
        description: paymentRequest.description,
        dueDate: paymentRequest.dueDate,
        paymentRequestId: paymentRequest.id,
      },
    };
  }
}
