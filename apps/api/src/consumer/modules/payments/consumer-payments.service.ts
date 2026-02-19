import { randomUUID } from 'crypto';

import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';

import { PaymentDirection, PaymentMethodTypes } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { CreatePaymentRequest, PaymentsHistoryQuery, TransferBody, WithdrawBody } from './dto';
import { StartPayment } from './dto/start-payment.dto';
import { MailingService } from '../../../shared/mailing.service';
import { PrismaService } from '../../../shared/prisma.service';
@Injectable()
export class ConsumerPaymentsService {
  private readonly logger = new Logger(ConsumerPaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private readonly mailingService: MailingService,
  ) {}

  /** Ensures consumer has completed profile
   * Legal Status
   * Tax ID
   * Passport/ID for individuals;
   * Tax ID, Phone for entities). */
  private async ensureProfileComplete(consumerId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      include: { personalDetails: true },
    });
    if (!consumer) return;
    const pd = consumer.personalDetails;
    const isIndividual =
      consumer.accountType === $Enums.AccountType.CONTRACTOR &&
      consumer.contractorKind === $Enums.ContractorKind.INDIVIDUAL;
    const complete =
      pd &&
      (isIndividual
        ? pd.legalStatus && pd.taxId?.trim() && pd.passportOrIdNumber?.trim()
        : pd.taxId?.trim() && pd.phoneNumber?.trim());
    if (!complete) {
      throw new BadRequestException(
        /* eslint-disable-next-line */
        `Please complete your profile (Legal Status, Tax ID, Passport/ID number) before creating requests or sending payments.`,
      );
    }
  }

  async listPayments(params: {
    consumerId: string;
    page: number;
    pageSize: number;
    status?: string;
    type?: string;
    search?: string;
  }) {
    const { consumerId, page, pageSize, status, type, search } = params;
    const consumerEmail = await this.getConsumerEmail(consumerId);

    const where: any = {
      OR: [
        { payerId: consumerId },
        { requesterId: consumerId },
        ...(consumerEmail
          ? [{ payerId: null, payerEmail: { equals: consumerEmail, mode: `insensitive` as const } }]
          : []),
      ],
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
          ledgerEntries: {
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
      const latestTx = paymentRequest.ledgerEntries[0];

      const counterparty = paymentRequest.payerId === consumerId ? paymentRequest.requester : paymentRequest.payer;
      const counterpartyEmail =
        paymentRequest.payerId === consumerId
          ? paymentRequest.requester.email
          : (paymentRequest.payer?.email ?? paymentRequest.payerEmail ?? ``);

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
          id: counterparty?.id ?? ``,
          email: counterpartyEmail,
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

  async getPaymentView(consumerId: string, paymentRequestId: string) {
    const consumerEmail = await this.getConsumerEmail(consumerId);
    const paymentRequest = await this.prisma.paymentRequestModel.findUnique({
      where: { id: paymentRequestId },
      include: {
        payer: { select: { id: true, email: true } },
        requester: { select: { id: true, email: true } },
        attachments: {
          orderBy: { createdAt: `desc` },
          include: {
            resource: true,
          },
        },
        ledgerEntries: {
          orderBy: { createdAt: `asc` },
        },
      },
    });

    if (!paymentRequest) {
      throw new NotFoundException(errorCodes.PAYMENT_REQUEST_NOT_FOUND_GET);
    }

    const isEmailOnlyPayer =
      !paymentRequest.payerId &&
      !!paymentRequest.payerEmail &&
      !!consumerEmail &&
      paymentRequest.payerEmail.toLowerCase() === consumerEmail;

    if (paymentRequest.payerId !== consumerId && paymentRequest.requesterId !== consumerId && !isEmailOnlyPayer) {
      throw new ForbiddenException(errorCodes.PAYMENT_ACCESS_DENIED_GET);
    }

    const isPayer = paymentRequest.payerId === consumerId || isEmailOnlyPayer;

    return {
      id: paymentRequest.id,
      amount: Number(paymentRequest.amount),
      currencyCode: paymentRequest.currencyCode,
      status: paymentRequest.status,
      description: paymentRequest.description,
      dueDate: paymentRequest.dueDate,
      sentDate: paymentRequest.sentDate,
      createdAt: paymentRequest.createdAt,
      updatedAt: paymentRequest.updatedAt,

      role: isPayer ? `PAYER` : `REQUESTER`,

      payer: paymentRequest.payer ?? { id: null, email: paymentRequest.payerEmail ?? null },
      requester: paymentRequest.requester,
      ledgerEntries: paymentRequest.ledgerEntries
        .map((entry) => {
          const metadata = JSON.parse(JSON.stringify(entry.metadata || {}));
          const amount = Number(entry.amount);

          return {
            id: entry.id,
            ledgerId: entry.ledgerId,
            currencyCode: entry.currencyCode,
            amount,
            direction: amount > 0 ? PaymentDirection.INCOME : PaymentDirection.OUTCOME,
            status: entry.status,
            type: entry.type,
            createdAt: entry.createdAt,
            rail: metadata.rail ?? null,
            counterpartyId: metadata.counterpartyId ?? null,
          };
        })
        .filter(
          (entry, index, self) =>
            index === self.findIndex((e) => e.ledgerId === entry.ledgerId && e.type === entry.type),
        ),

      attachments: paymentRequest.attachments.map((att) => ({
        id: att.resource.id,
        name: att.resource.originalName,
        downloadUrl: att.resource.downloadUrl,
        size: att.resource.size,
        createdAt: att.resource.createdAt,
      })),
    };
  }

  async startPayment(consumerId: string, body: StartPayment) {
    await this.ensureProfileComplete(consumerId);

    const recipient = await this.prisma.consumerModel.findFirst({
      where: { email: body.email, deletedAt: null },
    });

    if (!recipient) {
      throw new BadRequestException(errorCodes.RECIPIENT_NOT_FOUND_START_PAYMENT);
    }

    if (recipient.id === consumerId) {
      throw new BadRequestException(errorCodes.CANNOT_TRANSFER_TO_SELF_START_PAYMENT);
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_START_PAYMENT);
    }

    const paymentRail =
      body.method === PaymentMethodTypes.CREDIT_CARD ? $Enums.PaymentRail.CARD : $Enums.PaymentRail.BANK_TRANSFER;

    return this.prisma.$transaction(async (tx) => {
      // 🔐 Generate ledgerId INSIDE tx (idempotency-safe)
      const ledgerId = randomUUID();

      // 1️⃣ Create payment request (business intent)
      const paymentRequest = await tx.paymentRequestModel.create({
        data: {
          payerId: consumerId,
          requesterId: recipient.id,
          currencyCode: $Enums.CurrencyCode.USD,
          amount,
          description: body.description ?? null,
          status: $Enums.TransactionStatus.PENDING,
          createdBy: consumerId,
          updatedBy: consumerId,
        },
      });

      // 2️⃣ PAYER ledger entry (money leaves) — idempotency key prevents duplicate entries on retry
      await tx.ledgerEntryModel.create({
        data: {
          ledgerId,
          consumerId,
          paymentRequestId: paymentRequest.id,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.PENDING,
          amount: -amount, // SIGNED
          createdBy: consumerId,
          updatedBy: consumerId,
          idempotencyKey: `pr:${paymentRequest.id}:payer`,
          metadata: {
            rail: paymentRail,
            counterpartyId: recipient.id,
          },
        },
      });

      // 3️⃣ RECIPIENT ledger entry (money enters)
      await tx.ledgerEntryModel.create({
        data: {
          ledgerId,
          consumerId: recipient.id,
          paymentRequestId: paymentRequest.id,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          currencyCode: $Enums.CurrencyCode.USD,
          status: $Enums.TransactionStatus.PENDING,
          amount: amount, // SIGNED
          createdBy: consumerId,
          updatedBy: consumerId,
          idempotencyKey: `pr:${paymentRequest.id}:requester`,
          metadata: {
            rail: paymentRail,
            counterpartyId: consumerId,
          },
        },
      });

      return {
        paymentRequestId: paymentRequest.id,
        ledgerId,
      };
    });
  }

  async createPaymentRequest(consumerId: string, body: CreatePaymentRequest) {
    await this.ensureProfileComplete(consumerId);
    const normalizedEmail = body.email.trim().toLowerCase();

    const recipient = await this.prisma.consumerModel.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: `insensitive` },
        deletedAt: null,
      },
    });

    if (recipient?.id === consumerId) {
      throw new BadRequestException(errorCodes.REQUEST_FROM_SELF_BY_ID);
    }

    if (!recipient && normalizedEmail === (await this.getConsumerEmail(consumerId))) {
      throw new BadRequestException(errorCodes.REQUEST_FROM_SELF_BY_EMAIL);
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_CREATE_REQUEST);
    }

    const parseDate = (value?: string) => {
      if (!value) return null;
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        throw new BadRequestException(errorCodes.INVALID_DATE);
      }
      return date;
    };

    const dueDate = parseDate(body.dueDate);

    const paymentRequest = await this.prisma.paymentRequestModel.create({
      data: {
        payerId: recipient?.id ?? null,
        payerEmail: recipient?.email ?? normalizedEmail,
        requesterId: consumerId,
        currencyCode: body.currencyCode ?? $Enums.CurrencyCode.USD,
        amount,
        description: body.description ?? null,
        dueDate,
        status: $Enums.TransactionStatus.DRAFT,
        createdBy: consumerId,
        updatedBy: consumerId,
      },
    });

    if (!recipient) {
      this.logger.log({
        event: `payment_request_created_without_registered_recipient`,
        paymentRequestId: paymentRequest.id,
        requesterId: consumerId,
        payerEmail: normalizedEmail,
      });
    }

    return { paymentRequestId: paymentRequest.id };
  }

  async sendPaymentRequest(consumerId: string, paymentRequestId: string) {
    await this.ensureProfileComplete(consumerId);

    const result = await this.prisma.$transaction(async (tx) => {
      const paymentRequest = await tx.paymentRequestModel.findUnique({
        where: { id: paymentRequestId },
        select: {
          id: true,
          requesterId: true,
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

      if (paymentRequest.requesterId !== consumerId) {
        throw new ForbiddenException(errorCodes.PAYMENT_ACCESS_DENIED_SEND_DRAFT);
      }

      if (paymentRequest.status !== $Enums.TransactionStatus.DRAFT) {
        throw new BadRequestException(errorCodes.ONLY_DRAFT_REQUESTS_CAN_BE_SENT);
      }

      const amount = Number(paymentRequest.amount);
      if (!Number.isFinite(amount) || amount <= 0) {
        throw new BadRequestException(errorCodes.INVALID_AMOUNT_SEND_DRAFT);
      }

      const updated = await tx.paymentRequestModel.update({
        where: { id: paymentRequestId },
        data: {
          status: $Enums.TransactionStatus.PENDING,
          sentDate: new Date(),
          updatedBy: consumerId,
        },
      });

      if (!paymentRequest.payerId && paymentRequest._count.ledgerEntries > 0) {
        throw new BadRequestException(errorCodes.INVALID_LEDGER_STATE_EMAIL_PAYMENT_SEND);
      }

      if (paymentRequest.payerId && paymentRequest._count.ledgerEntries > 0) {
        throw new BadRequestException(errorCodes.INVALID_LEDGER_STATE_DRAFT);
      }

      if (paymentRequest._count.ledgerEntries === 0 && paymentRequest.payerId) {
        const ledgerId = randomUUID();
        const payerKey = `pr:${paymentRequest.id}:payer`;
        const requesterKey = `pr:${paymentRequest.id}:requester`;

        await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId: paymentRequest.payerId,
            paymentRequestId: paymentRequest.id,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            currencyCode: paymentRequest.currencyCode,
            status: $Enums.TransactionStatus.PENDING,
            amount: -amount,
            createdBy: consumerId,
            updatedBy: consumerId,
            idempotencyKey: payerKey,
            metadata: {
              rail: $Enums.PaymentRail.CARD,
              counterpartyId: paymentRequest.requesterId,
            },
          },
        });

        await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId: paymentRequest.requesterId,
            paymentRequestId: paymentRequest.id,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            currencyCode: paymentRequest.currencyCode,
            status: $Enums.TransactionStatus.PENDING,
            amount: amount,
            createdBy: consumerId,
            updatedBy: consumerId,
            idempotencyKey: requesterKey,
            metadata: {
              rail: $Enums.PaymentRail.CARD,
              counterpartyId: paymentRequest.payerId,
            },
          },
        });
      }

      return {
        paymentRequestId: updated.id,
        email: {
          payerEmail: paymentRequest.payer?.email ?? paymentRequest.payerEmail ?? ``,
          requesterEmail: paymentRequest.requester.email,
          amount,
          currencyCode: paymentRequest.currencyCode,
          description: paymentRequest.description,
          dueDate: paymentRequest.dueDate,
          paymentRequestId: paymentRequest.id,
        },
      };
    });

    if (result.email.payerEmail) {
      void this.mailingService.sendPaymentRequestEmail(result.email);
    }

    return { paymentRequestId: result.paymentRequestId };
  }

  async getBalancesCompleted(consumerId: string): Promise<Record<$Enums.CurrencyCode, number>> {
    const rows = await this.prisma.ledgerEntryModel.groupBy({
      by: [`currencyCode`],
      where: {
        consumerId,
        status: $Enums.TransactionStatus.COMPLETED,
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
    });

    const result: Record<$Enums.CurrencyCode, number> = {} as any;

    for (const row of rows) {
      result[row.currencyCode] = Number(row._sum.amount ?? 0);
    }

    return result;
  }

  private async getConsumerEmail(consumerId: string): Promise<string | null> {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });
    return consumer?.email?.trim().toLowerCase() ?? null;
  }

  async getBalancesIncludePending(consumerId: string): Promise<Record<$Enums.CurrencyCode, number>> {
    const rows = await this.prisma.ledgerEntryModel.groupBy({
      by: [`currencyCode`],
      where: {
        consumerId,
        status: {
          in: [$Enums.TransactionStatus.COMPLETED, $Enums.TransactionStatus.PENDING],
        },
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
    });

    const result: Record<$Enums.CurrencyCode, number> = {} as any;

    for (const row of rows) {
      result[row.currencyCode] = Number(row._sum.amount ?? 0);
    }

    return result;
  }

  async getAvailableBalance(consumerId: string): Promise<number> {
    const result = await this.prisma.ledgerEntryModel.aggregate({
      where: {
        consumerId,
        status: $Enums.TransactionStatus.COMPLETED,
        deletedAt: null,
      },
      _sum: {
        amount: true,
      },
    });

    return Number(result._sum.amount ?? 0);
  }

  async getHistory(consumerId: string, query: PaymentsHistoryQuery) {
    const { direction, status, limit = 20, offset = 0 } = query;

    const where: any = { consumerId, deletedAt: null };

    if (status) {
      where.status = status;
    }

    // direction filter via signed amount
    if (direction === PaymentDirection.INCOME) {
      where.amount = { gt: 0 };
    } else if (direction === PaymentDirection.OUTCOME) {
      where.amount = { lt: 0 };
    }

    const rows = await this.prisma.ledgerEntryModel.findMany({
      where,
      orderBy: { createdAt: `desc` },
    });

    // 1️⃣ Group by ledgerId
    const byLedger = new Map<string, typeof rows>();

    for (const row of rows) {
      if (!byLedger.has(row.ledgerId)) {
        byLedger.set(row.ledgerId, []);
      }
      byLedger.get(row.ledgerId)!.push(row);
    }

    // 2️⃣ Collapse into one history item per ledgerId
    const items = Array.from(byLedger.values())
      .map((entries) => {
        // Prefer entry belonging to this consumer (always exists)
        const entry = entries.find((e) => e.consumerId === consumerId) ?? entries[0];
        const amount = Number(entry.amount);
        const metadata = JSON.parse(JSON.stringify(entry.metadata || {}));

        return {
          id: entry.id,
          ledgerId: entry.ledgerId,
          type: entry.type,
          status: entry.status,
          currencyCode: entry.currencyCode,
          amount: amount,
          direction: amount ? PaymentDirection.INCOME : PaymentDirection.OUTCOME,
          createdAt: entry.createdAt,
          rail: metadata.rail ?? null,
          paymentRequestId: entry.paymentRequestId ?? null,
        };
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(offset, offset + limit);

    return {
      items,
      total: byLedger.size,
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

    const result = await this.prisma.ledgerEntryModel.aggregate({
      where: {
        consumerId,
        amount: { lt: 0 }, // 👈 outgoing money
        createdAt: { gte: start },
        status: {
          in: [$Enums.TransactionStatus.PENDING, $Enums.TransactionStatus.COMPLETED],
        },
        deletedAt: null,
      },
      _sum: { amount: true },
    });

    // amount is negative → return absolute value
    return Math.abs(Number(result._sum.amount ?? 0));
  }

  private async ensureLimits(consumerId: string, amount: number) {
    const { maxPerOperation, dailyLimit } = await this.getKycLimits(consumerId);

    if (amount > maxPerOperation) {
      throw new BadRequestException(errorCodes.AMOUNT_EXCEEDS_PER_OPERATION_LIMIT);
    }

    const todayTotal = await this.getTodayOutgoingTotal(consumerId);
    if (todayTotal + amount > dailyLimit) {
      throw new BadRequestException(errorCodes.AMOUNT_EXCEEDS_DAILY_LIMIT);
    }
  }

  async withdraw(consumerId: string, body: WithdrawBody, idempotencyKey: string | undefined) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_WITHDRAW);
    }

    await this.ensureLimits(consumerId, amount);

    const key = idempotencyKey?.trim();
    if (key) {
      const existing = await this.prisma.ledgerEntryModel.findFirst({
        where: {
          idempotencyKey: `withdraw:${key}`,
          consumerId,
          type: $Enums.LedgerEntryType.USER_PAYOUT,
          deletedAt: null,
        },
      });
      if (existing) return existing;
    }

    const ledgerId = randomUUID();

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${consumerId}::text)::bigint)`);

        const balanceResult = await tx.ledgerEntryModel.aggregate({
          where: {
            consumerId,
            status: $Enums.TransactionStatus.COMPLETED,
            deletedAt: null,
          },
          _sum: { amount: true },
        });
        const balance = Number(balanceResult._sum.amount ?? 0);
        if (amount > balance) {
          throw new BadRequestException(errorCodes.INSUFFICIENT_BALANCE_WITHDRAW);
        }

        const payoutEntry = await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId,
            type: $Enums.LedgerEntryType.USER_PAYOUT,
            currencyCode: $Enums.CurrencyCode.USD,
            status: $Enums.TransactionStatus.PENDING,
            amount: -amount,
            createdBy: consumerId,
            updatedBy: consumerId,
            idempotencyKey: key ? `withdraw:${key}` : undefined,
            metadata: {
              rail: $Enums.PaymentRail.BANK_TRANSFER,
              requesterId: consumerId,
            },
          },
        });

        return payoutEntry;
      });
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002` && key) {
        const existing = await this.prisma.ledgerEntryModel.findFirst({
          where: {
            idempotencyKey: `withdraw:${key}`,
            consumerId,
            type: $Enums.LedgerEntryType.USER_PAYOUT,
            deletedAt: null,
          },
        });
        if (existing) return existing;
      }
      throw err;
    }
  }

  async transfer(consumerId: string, body: TransferBody, idempotencyKey: string | undefined) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_TRANSFER);
    }

    await this.ensureLimits(consumerId, amount);

    const recipient = await this.prisma.consumerModel.findFirst({
      where: {
        OR: [{ email: body.recipient }, { personalDetails: { phoneNumber: body.recipient } }],
        deletedAt: null,
      },
    });

    if (!recipient) {
      throw new NotFoundException(errorCodes.RECIPIENT_NOT_FOUND_TRANSFER);
    }

    if (recipient.id === consumerId) {
      throw new BadRequestException(errorCodes.CANNOT_TRANSFER_TO_SELF_TRANSFER);
    }

    const key = idempotencyKey?.trim();
    if (key) {
      const existing = await this.prisma.ledgerEntryModel.findFirst({
        where: {
          idempotencyKey: `transfer:${key}:sender`,
          consumerId,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          deletedAt: null,
        },
        select: { ledgerId: true },
      });
      if (existing) return { ledgerId: existing.ledgerId };
    }

    const ledgerId = randomUUID();
    const [firstId, secondId] = [consumerId, recipient.id].sort();

    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${firstId}::text)::bigint)`);
        await tx.$queryRaw(Prisma.sql`SELECT pg_advisory_xact_lock(hashtext(${secondId}::text)::bigint)`);

        const balanceResult = await tx.ledgerEntryModel.aggregate({
          where: {
            consumerId,
            status: $Enums.TransactionStatus.COMPLETED,
            deletedAt: null,
          },
          _sum: { amount: true },
        });
        const balance = Number(balanceResult._sum.amount ?? 0);
        if (amount > balance) {
          throw new BadRequestException(errorCodes.INSUFFICIENT_BALANCE_TRANSFER);
        }

        await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            currencyCode: $Enums.CurrencyCode.USD,
            status: $Enums.TransactionStatus.COMPLETED,
            amount: -amount,
            createdBy: consumerId,
            updatedBy: consumerId,
            idempotencyKey: key ? `transfer:${key}:sender` : undefined,
            metadata: {
              rail: $Enums.PaymentRail.BANK_TRANSFER,
              senderId: consumerId,
              recipientId: recipient.id,
            },
          },
        });

        await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId: recipient.id,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            currencyCode: $Enums.CurrencyCode.USD,
            status: $Enums.TransactionStatus.COMPLETED,
            amount: +amount,
            createdBy: consumerId,
            updatedBy: consumerId,
            idempotencyKey: key ? `transfer:${key}:recipient` : undefined,
            metadata: {
              rail: $Enums.PaymentRail.BANK_TRANSFER,
              senderId: consumerId,
              recipientId: recipient.id,
            },
          },
        });

        return { ledgerId };
      });
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002` && key) {
        const existing = await this.prisma.ledgerEntryModel.findFirst({
          where: {
            idempotencyKey: `transfer:${key}:sender`,
            consumerId,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            deletedAt: null,
          },
          select: { ledgerId: true },
        });
        if (existing) return { ledgerId: existing.ledgerId };
      }
      throw err;
    }
  }
}
