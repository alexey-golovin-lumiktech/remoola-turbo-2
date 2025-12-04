import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { StartPaymentDto } from './dto/start-payment.dto';
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

    const [total, results] = await Promise.all([
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

    const items = results.map((p) => {
      const latestTx = p.transactions[0];

      const counterparty = p.payerId === consumerId ? p.requester : p.payer;

      let latestTransaction;
      if (latestTx) {
        latestTransaction = {
          id: latestTx.id,
          status: latestTx.status,
          createdAt: latestTx.createdAt.toISOString(),
        };
      }

      return {
        id: p.id,
        amount: Number(p.amount),
        currencyCode: p.currencyCode,
        status: p.status,
        type: p.type,
        description: p.description,
        createdAt: p.createdAt.toISOString(),

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
    const pr = await this.prisma.paymentRequestModel.findUnique({
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

    if (!pr) throw new NotFoundException(`Payment request not found`);

    if (pr.payerId !== consumerId && pr.requesterId !== consumerId) {
      throw new ForbiddenException(`You do not have access to this payment`);
    }

    const response = {
      id: pr.id,
      amount: Number(pr.amount),
      currencyCode: pr.currencyCode,
      status: pr.status,
      type: pr.type,
      description: pr.description,
      dueDate: pr.dueDate,
      expectationDate: pr.expectationDate,
      sentDate: pr.sentDate,
      createdAt: pr.createdAt,
      updatedAt: pr.updatedAt,

      payer: {
        id: pr.payer.id,
        email: pr.payer.email,
      },

      requester: {
        id: pr.requester.id,
        email: pr.requester.email,
      },

      transactions: pr.transactions.map((t) => ({
        id: t.id,
        status: t.status,
        actionType: t.actionType,
        createdAt: t.createdAt,
      })),

      attachments: pr.attachments.map((a) => ({
        id: a.resource.id,
        name: a.resource.originalName,
        downloadUrl: a.resource.downloadUrl,
        size: a.resource.size,
        createdAt: a.resource.createdAt,
      })),
    };

    return response;
  }

  async startPayment(consumerId: string, dto: StartPaymentDto) {
    const recipient = await this.prisma.consumerModel.findUnique({
      where: { email: dto.email },
    });

    if (!recipient) {
      throw new BadRequestException(`Recipient not found`);
    }

    if (recipient.id === consumerId) {
      throw new BadRequestException(`You cannot send payment to yourself.`);
    }

    const amount = Number(dto.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new BadRequestException(`Invalid amount`);
    }

    const transactionType: $Enums.TransactionType =
      dto.method === `CREDIT_CARD` ? $Enums.TransactionType.CREDIT_CARD : $Enums.TransactionType.BANK_TRANSFER;

    // 1. Create Payment Request
    const paymentRequest = await this.prisma.paymentRequestModel.create({
      data: {
        payerId: consumerId,
        requesterId: recipient.id,
        currencyCode: $Enums.CurrencyCode.USD,
        amount,
        description: dto.description ?? null,
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
