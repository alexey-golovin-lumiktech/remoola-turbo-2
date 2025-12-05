import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { StartPayment } from './dto/start-payment.dto';
import { PrismaService } from '../../../shared/prisma.service';
@Injectable()
export class ConsumerPaymentsService {
  constructor(private prisma: PrismaService) {}

  async listPayments(params: {
    consumerId: string;
    page: number;
    pageSize: number;
    status?: string;
    type?: string;
    search?: string;
  }) {
    const { consumerId, page, pageSize, status, type, search } = params;

    const where: any = {
      OR: [{ payerId: consumerId }, { requesterId: consumerId }],
    };

    if (status) where.status = status;
    if (type) where.type = type;

    if (search) {
      where.OR = [
        { description: { contains: search, mode: `insensitive` } },
        { requester: { email: { contains: search, mode: `insensitive` } } },
        { payer: { email: { contains: search, mode: `insensitive` } } },
      ];
    }

    const [total, paymentRequests] = await Promise.all([
      this.prisma.paymentRequestModel.count({ where }),

      this.prisma.paymentRequestModel.findMany({
        where,
        include: {
          requester: true,
          payer: true,
          transactions: {
            orderBy: { createdAt: `desc` },
            take: 1,
          },
        },
        orderBy: {
          createdAt: `desc`,
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);

    const items = paymentRequests.map((paymentRequest) => {
      const latestTx = paymentRequest.transactions[0];

      const counterparty = paymentRequest.payerId === consumerId ? paymentRequest.requester : paymentRequest.payer;

      let latestTransaction;
      if (latestTx) {
        latestTransaction = {
          id: latestTx.id,
          status: latestTx.status,
          createdAt: latestTx.createdAt.toISOString(),
        };
      }

      return {
        id: paymentRequest.id,
        amount: Number(paymentRequest.amount),
        currencyCode: paymentRequest.currencyCode,
        status: paymentRequest.status,
        type: paymentRequest.type,
        description: paymentRequest.description,
        createdAt: paymentRequest.createdAt.toISOString(),

        counterparty: {
          id: counterparty.id,
          email: counterparty.email,
        },

        latestTransaction: latestTransaction,
      };
    });

    return {
      items,
      total,
      page,
      pageSize,
    };
  }

  async getPaymentView(consumerId: string, id: string) {
    const paymentRequest = await this.prisma.paymentRequestModel.findUnique({
      where: { id },
      include: {
        payer: true,
        requester: true,
        attachments: {
          include: {
            resource: true,
          },
        },
        transactions: true,
      },
    });

    if (!paymentRequest) throw new NotFoundException(`Payment request not found`);

    if (paymentRequest.payerId !== consumerId && paymentRequest.requesterId !== consumerId) {
      throw new ForbiddenException(`You do not have access to this payment`);
    }

    const response = {
      id: paymentRequest.id,
      amount: Number(paymentRequest.amount),
      currencyCode: paymentRequest.currencyCode,
      status: paymentRequest.status,
      type: paymentRequest.type,
      description: paymentRequest.description,
      dueDate: paymentRequest.dueDate,
      expectationDate: paymentRequest.expectationDate,
      sentDate: paymentRequest.sentDate,
      createdAt: paymentRequest.createdAt,
      updatedAt: paymentRequest.updatedAt,

      payer: {
        id: paymentRequest.payer.id,
        email: paymentRequest.payer.email,
      },

      requester: {
        id: paymentRequest.requester.id,
        email: paymentRequest.requester.email,
      },

      transactions: paymentRequest.transactions.map((paymentRequestTransaction) => ({
        id: paymentRequestTransaction.id,
        status: paymentRequestTransaction.status,
        actionType: paymentRequestTransaction.actionType,
        createdAt: paymentRequestTransaction.createdAt,
      })),

      attachments: paymentRequest.attachments.map((paymentRequestAttachment) => ({
        id: paymentRequestAttachment.resource.id,
        name: paymentRequestAttachment.resource.originalName,
        downloadUrl: paymentRequestAttachment.resource.downloadUrl,
        size: paymentRequestAttachment.resource.size,
        createdAt: paymentRequestAttachment.resource.createdAt,
      })),
    };

    return response;
  }

  async startPayment(consumerId: string, body: StartPayment) {
    const recipient = await this.prisma.consumerModel.findUnique({
      where: { email: body.email },
    });

    if (!recipient) {
      throw new BadRequestException(`Recipient not found`);
    }

    if (recipient.id === consumerId) {
      throw new BadRequestException(`You cannot send payment to yourself.`);
    }

    const amount = Number(body.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException(`Invalid amount`);
    }

    const transactionType: $Enums.TransactionType =
      body.method === `CREDIT_CARD` ? $Enums.TransactionType.CREDIT_CARD : $Enums.TransactionType.BANK_TRANSFER;

    // 1. Create Payment Request
    const paymentRequest = await this.prisma.paymentRequestModel.create({
      data: {
        payerId: consumerId,
        requesterId: recipient.id,
        currencyCode: $Enums.CurrencyCode.USD,
        amount,
        description: body.description ?? null,
        type: transactionType,
        status: $Enums.TransactionStatus.PENDING,
        createdBy: consumerId,
        updatedBy: consumerId,
      },
    });

    // 2. Create Transaction linked to the request
    await this.prisma.transactionModel.create({
      data: {
        consumerId,
        paymentRequestId: paymentRequest.id,
        originAmount: amount,
        currencyCode: $Enums.CurrencyCode.USD,
        type: transactionType,
        actionType: $Enums.TransactionActionType.OUTCOME,
        status: $Enums.TransactionStatus.PENDING,
        createdBy: consumerId,
        updatedBy: consumerId,
      },
    });

    return {
      paymentRequestId: paymentRequest.id,
    };
  }
}
