import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { PaymentsHistoryQueryDto, TransferDto, WithdrawDto } from './dto';
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

  async getBalances(consumerId: string) {
    const txs = await this.prisma.transactionModel.findMany({
      where: { consumerId },
    });

    const map: Record<string, number> = {};

    for (const tx of txs) {
      const amount = Number(tx.originAmount);
      const cur = tx.currencyCode;

      if (!map[cur]) map[cur] = 0;

      const isIncome = tx.actionType === `INCOME` && [`COMPLETED`, `WAITING`].includes(tx.status);

      const isOutcome = tx.actionType === `OUTCOME` && [`COMPLETED`, `PENDING`].includes(tx.status);

      if (isIncome) map[cur] += amount;
      if (isOutcome) map[cur] -= amount;
    }

    return map;
  }

  async getAvailableBalance(consumerId: string): Promise<number> {
    const incoming = await this.prisma.transactionModel.aggregate({
      where: {
        consumerId,
        actionType: $Enums.TransactionActionType.INCOME,
        status: { in: [$Enums.TransactionStatus.COMPLETED, $Enums.TransactionStatus.WAITING] },
      },
      _sum: { originAmount: true },
    });

    const outgoing = await this.prisma.transactionModel.aggregate({
      where: {
        consumerId,
        actionType: $Enums.TransactionActionType.OUTCOME,
        status: { in: [$Enums.TransactionStatus.COMPLETED, $Enums.TransactionStatus.PENDING] },
      },
      _sum: { originAmount: true },
    });

    const inVal = Number(incoming._sum.originAmount ?? 0);
    const outVal = Number(outgoing._sum.originAmount ?? 0);

    return inVal - outVal;
  }

  async getHistory(consumerId: string, query: PaymentsHistoryQueryDto) {
    const { actionType, status, limit = 20, offset = 0 } = query;

    const where: any = { consumerId };
    if (actionType) where.actionType = actionType;
    if (status) where.status = status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.transactionModel.findMany({
        where,
        orderBy: { createdAt: `desc` },
        skip: offset,
        take: limit,
      }),
      this.prisma.transactionModel.count({ where }),
    ]);

    return {
      items,
      total,
      limit,
      offset,
    };
  }

  private async getKycLimits(consumerId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { legalVerified: true },
    });

    const isVerified = !!consumer?.legalVerified;

    // You can tune these
    return {
      maxPerOperation: isVerified ? 10_000 : 1_000,
      dailyLimit: isVerified ? 50_000 : 5_000,
    };
  }

  private async getTodayOutgoingTotal(consumerId: string) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const result = await this.prisma.transactionModel.aggregate({
      where: {
        consumerId,
        actionType: $Enums.TransactionActionType.OUTCOME,
        createdAt: { gte: start },
        status: { in: [$Enums.TransactionStatus.PENDING, $Enums.TransactionStatus.COMPLETED] },
      },
      _sum: { originAmount: true },
    });

    return Number(result._sum.originAmount ?? 0);
  }

  private async ensureLimits(consumerId: string, amount: number) {
    const { maxPerOperation, dailyLimit } = await this.getKycLimits(consumerId);

    if (amount > maxPerOperation) {
      throw new BadRequestException(`Amount exceeds per-operation limit of ${maxPerOperation}.`);
    }

    const todayTotal = await this.getTodayOutgoingTotal(consumerId);
    if (todayTotal + amount > dailyLimit) {
      throw new BadRequestException(`Amount exceeds daily limit. Remaining today: ${dailyLimit - todayTotal}`);
    }
  }

  async withdraw(consumerId: string, dto: WithdrawDto) {
    const numericAmount = Number(dto.amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new BadRequestException(`Invalid amount`);
    }

    await this.ensureLimits(consumerId, numericAmount);

    const balance = await this.getAvailableBalance(consumerId);
    if (numericAmount > balance) {
      throw new BadRequestException(`Insufficient balance`);
    }

    return this.prisma.$transaction(async (tx) => {
      // Create our internal transaction first
      const transaction = await tx.transactionModel.create({
        data: {
          consumerId,
          type: $Enums.TransactionType.BANK_TRANSFER,
          currencyCode: $Enums.CurrencyCode.USD, // adjust if you support multiple
          actionType: $Enums.TransactionActionType.OUTCOME,
          status: $Enums.TransactionStatus.PENDING,
          originAmount: numericAmount,
          createdBy: consumerId,
          updatedBy: consumerId,
          paymentRequestId: null,
        },
      });

      // // OPTIONAL: Stripe payout integration
      // const consumer = await this.prisma.consumerModel.findUnique({
      //   where: { id: consumerId },
      //   select: { stripeCustomerId: true },
      // });
      // if (consumer?.stripeCustomerId) {
      //   const payout = await this.stripeService.createWithdrawalPayout({
      //     consumerId,
      //     stripeCustomerId: consumer.stripeCustomerId,
      //     amount: numericAmount,
      //     currency: `usd`,
      //     transactionId: transaction.id,
      //     method: dto.method,
      //   });

      //   await tx.transactionModel.update({
      //     where: { id: transaction.id },
      //     data: { stripeId: payout.id },
      //   });
      // }

      return transaction;
    });
  }

  async transfer(consumerId: string, dto: TransferDto) {
    const numericAmount = Number(dto.amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      throw new BadRequestException(`Invalid amount`);
    }

    await this.ensureLimits(consumerId, numericAmount);

    const balance = await this.getAvailableBalance(consumerId);
    if (numericAmount > balance) {
      throw new BadRequestException(`Insufficient balance`);
    }

    const recipient = await this.prisma.consumerModel.findFirst({
      where: {
        OR: [
          { email: dto.recipient },
          // via personal details phone
          {
            personalDetails: {
              phoneNumber: dto.recipient,
            },
          },
        ],
      },
      include: { personalDetails: true },
    });

    if (!recipient) {
      throw new NotFoundException(`Recipient not found`);
    }

    if (recipient.id === consumerId) {
      throw new BadRequestException(`Cannot transfer to yourself`);
    }

    return this.prisma.$transaction(async (tx) => {
      // OUTCOME record for sender
      const outgoing = await tx.transactionModel.create({
        data: {
          consumerId,
          type: $Enums.TransactionType.BANK_TRANSFER,
          currencyCode: $Enums.CurrencyCode.USD,
          actionType: $Enums.TransactionActionType.OUTCOME,
          status: $Enums.TransactionStatus.COMPLETED,
          originAmount: numericAmount,
          createdBy: consumerId,
          updatedBy: consumerId,
        },
      });

      // INCOME record for recipient
      await tx.transactionModel.create({
        data: {
          consumerId: recipient.id,
          type: $Enums.TransactionType.BANK_TRANSFER,
          currencyCode: $Enums.CurrencyCode.USD,
          actionType: $Enums.TransactionActionType.INCOME,
          status: $Enums.TransactionStatus.COMPLETED,
          originAmount: numericAmount,
          createdBy: consumerId,
          updatedBy: consumerId,
        },
      });

      return outgoing;
    });
  }
}
