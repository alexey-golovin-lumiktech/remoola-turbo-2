import { randomUUID } from 'crypto';

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

import { type ConsumerAppScope, PAYMENT_DIRECTION, PAYMENT_METHOD, toCurrencyOrDefault } from '@remoola/api-types';
import { $Enums, Prisma } from '@remoola/database-2';
import { errorCodes } from '@remoola/shared-constants';

import { CreatePaymentRequest, PaymentsHistoryQuery, TransferBody, WithdrawBody } from './dto';
import { StartPayment } from './dto/start-payment.dto';
import {
  BalanceCalculationService,
  BalanceCalculationMode,
  buildWalletEligibilityCondition,
} from '../../../shared/balance-calculation.service';
import { MailingService } from '../../../shared/mailing.service';
import { appendConsumerAppScopeToMetadata } from '../../../shared/payment-link-metadata';
import { PrismaService } from '../../../shared/prisma.service';
import { isConsumerProfileCompleteForVerification, isConsumerVerificationEffective } from '../../../shared-common';
import { normalizeConsumerFacingTransactionStatus, buildConsumerStatusFilter } from '../../consumer-status-compat';
import { buildConsumerDocumentDownloadUrl } from '../documents/document-download-url';

@Injectable()
export class ConsumerPaymentsService {
  private readonly logger = new Logger(ConsumerPaymentsService.name);
  private static readonly uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  constructor(
    private prisma: PrismaService,
    private readonly mailingService: MailingService,
    private readonly balanceService: BalanceCalculationService,
  ) {}

  private getEffectiveLedgerStatus(
    entry:
      | {
          status: $Enums.TransactionStatus;
          outcomes?: Array<{ status: $Enums.TransactionStatus }>;
        }
      | null
      | undefined,
  ): $Enums.TransactionStatus | null {
    if (!entry) return null;
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private getEffectivePaymentRequestStatus(
    paymentRequestStatus: $Enums.TransactionStatus,
    entry:
      | {
          status: $Enums.TransactionStatus;
          outcomes?: Array<{ status: $Enums.TransactionStatus }>;
        }
      | null
      | undefined,
  ): $Enums.TransactionStatus {
    return this.getEffectiveLedgerStatus(entry) ?? paymentRequestStatus;
  }

  private getRequesterSettlementEntryType(paymentRail: $Enums.PaymentRail): $Enums.LedgerEntryType {
    return paymentRail === $Enums.PaymentRail.CARD
      ? $Enums.LedgerEntryType.USER_DEPOSIT
      : $Enums.LedgerEntryType.USER_PAYMENT;
  }

  private isInvoiceResource(resource: { resourceTags?: Array<{ tag: { name: string } }> } | null | undefined): boolean {
    return resource?.resourceTags?.some((resourceTag) => resourceTag.tag.name.startsWith(`INVOICE-`)) ?? false;
  }

  private async lockConsumerOutgoing(
    tx: Pick<Prisma.TransactionClient, `$executeRaw`>,
    consumerId: string,
  ): Promise<void> {
    await tx.$executeRaw(Prisma.sql`
      SELECT pg_advisory_xact_lock(hashtext((${consumerId} || ':outgoing')::text)::bigint)
    `);
  }

  private buildTransferRecipientWhere(body: TransferBody): Prisma.ConsumerModelWhereInput {
    const recipient = body.recipient?.trim();
    if (recipient) {
      return {
        OR: [{ email: { equals: recipient, mode: `insensitive` } }, { personalDetails: { phoneNumber: recipient } }],
        deletedAt: null,
      };
    }

    const legacyRecipientId = body.recipientId?.trim();
    if (!legacyRecipientId) {
      throw new NotFoundException(errorCodes.RECIPIENT_NOT_FOUND_TRANSFER);
    }

    const orConditions: Prisma.ConsumerModelWhereInput[] = [
      { email: { equals: legacyRecipientId, mode: `insensitive` } },
      { personalDetails: { phoneNumber: legacyRecipientId } },
    ];

    if (ConsumerPaymentsService.uuidPattern.test(legacyRecipientId)) {
      orConditions.unshift({ id: legacyRecipientId });
    }

    return {
      OR: orConditions,
      deletedAt: null,
    };
  }

  private normalizeProductLedgerType(
    type: $Enums.LedgerEntryType,
    paymentRequestId: string | null | undefined,
  ): $Enums.LedgerEntryType {
    if (!paymentRequestId) return type;
    if (type === $Enums.LedgerEntryType.USER_DEPOSIT) return $Enums.LedgerEntryType.USER_PAYMENT;
    if (type === $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL) return $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL;
    return type;
  }

  private async ensureProfileComplete(consumerId: string) {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      include: { personalDetails: true },
    });
    if (!consumer) return;
    if (!isConsumerProfileCompleteForVerification(consumer)) {
      throw new BadRequestException(
        /* eslint-disable-next-line */
        `Please complete your profile (Legal Status, Tax ID, Passport/ID number) before creating requests or sending payments.`,
      );
    }
  }

  async assertProfileCompleteForVerification(consumerId: string): Promise<void> {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      include: { personalDetails: true },
    });
    if (!consumer) return;
    if (!isConsumerProfileCompleteForVerification(consumer)) {
      throw new BadRequestException(errorCodes.PROFILE_INCOMPLETE_VERIFY);
    }
  }

  async listPayments(params: {
    consumerId: string;
    page: number;
    pageSize: number;
    status?: string;
    type?: string;
    role?: string;
    search?: string;
  }) {
    const { consumerId, page, pageSize, status, type, role, search } = params;
    const consumerEmail = await this.getConsumerEmail(consumerId);
    const normalizedConsumerEmail = consumerEmail?.trim().toLowerCase() ?? null;
    const effectiveStatusFilter = buildConsumerStatusFilter(status);
    const roleConditions = this.buildPaymentRoleConditions(consumerId, consumerEmail, role);

    const whereBase: Prisma.PaymentRequestModelWhereInput = search
      ? {
          AND: [
            {
              OR: roleConditions,
            },
            {
              OR: [
                { description: { contains: search, mode: `insensitive` } },
                { requester: { email: { contains: search, mode: `insensitive` } } },
                { requesterEmail: { contains: search, mode: `insensitive` } },
                { payer: { email: { contains: search, mode: `insensitive` } } },
                { payerEmail: { contains: search, mode: `insensitive` } },
              ],
            },
          ],
          ...(type && { type: type as $Enums.TransactionType }),
        }
      : {
          OR: roleConditions,
          ...(type && { type: type as $Enums.TransactionType }),
        };
    const include = {
      requester: true,
      payer: true,
      ledgerEntries: {
        where: { consumerId },
        orderBy: { createdAt: `desc` as const },
        take: 1,
        include: {
          outcomes: {
            orderBy: { createdAt: `desc` as const },
            take: 1,
            select: { status: true },
          },
        },
      },
    };
    const orderBy = {
      createdAt: `desc` as const,
    };
    type PaymentRequestWithInclude = Prisma.PaymentRequestModelGetPayload<{ include: typeof include }>;
    let total = 0;
    let paymentRequests: PaymentRequestWithInclude[] = [];

    if (effectiveStatusFilter && typeof this.prisma.$queryRaw === `function`) {
      const roleSql = this.buildPaymentRoleSql(consumerId, normalizedConsumerEmail, role);
      const searchTerm = search?.trim();
      const searchPattern = searchTerm ? `%${searchTerm}%` : null;
      const typeSql = type ? Prisma.sql`AND pr.type::text = ${type}` : Prisma.empty;
      const searchSql = searchPattern
        ? Prisma.sql`
            AND (
              LOWER(COALESCE(pr.description, '')) LIKE LOWER(${searchPattern})
              OR LOWER(COALESCE(requester.email, '')) LIKE LOWER(${searchPattern})
              OR LOWER(COALESCE(pr.requester_email, '')) LIKE LOWER(${searchPattern})
              OR LOWER(COALESCE(payer.email, '')) LIKE LOWER(${searchPattern})
              OR LOWER(COALESCE(pr.payer_email, '')) LIKE LOWER(${searchPattern})
            )
          `
        : Prisma.empty;
      const statusCoalesce = Prisma.sql`COALESCE(
        latest_outcome.status::text,
        latest_le.status::text,
        pr.status::text
      )`;
      const listPaymentsStatusSql =
        typeof effectiveStatusFilter === `object` && `in` in effectiveStatusFilter
          ? Prisma.sql`AND ${statusCoalesce} IN (${Prisma.join(effectiveStatusFilter.in)})`
          : Prisma.sql`AND ${statusCoalesce} = ${effectiveStatusFilter}`;
      const filteredPaymentIdsSql = Prisma.sql`
        SELECT pr.id, pr.created_at
        FROM payment_request pr
        LEFT JOIN consumer requester ON requester.id = pr.requester_id
        LEFT JOIN consumer payer ON payer.id = pr.payer_id
        LEFT JOIN LATERAL (
          SELECT le.id, le.status
          FROM ledger_entry le
          WHERE le.payment_request_id = pr.id
            AND le.consumer_id::text = ${consumerId}
            AND le.deleted_at IS NULL
          ORDER BY le.created_at DESC, le.id DESC
          LIMIT 1
        ) latest_le ON true
        LEFT JOIN LATERAL (
          SELECT leo.status
          FROM ledger_entry_outcome leo
          WHERE leo.ledger_entry_id = latest_le.id
          ORDER BY leo.created_at DESC, leo.id DESC
          LIMIT 1
        ) latest_outcome ON true
        WHERE ${roleSql}
          ${typeSql}
          ${searchSql}
          ${listPaymentsStatusSql}
      `;
      const [totalRows, pageIdRows] = await Promise.all([
        this.prisma.$queryRaw<Array<{ total: number }>>(Prisma.sql`
          WITH filtered AS (${filteredPaymentIdsSql})
          SELECT COUNT(*)::int AS total
          FROM filtered
        `),
        this.prisma.$queryRaw<Array<{ id: string }>>(Prisma.sql`
          WITH filtered AS (${filteredPaymentIdsSql})
          SELECT id
          FROM filtered
          ORDER BY created_at DESC, id DESC
          OFFSET ${(page - 1) * pageSize}
          LIMIT ${pageSize}
        `),
      ]);
      const pageIds = pageIdRows.map((row) => row.id);
      total = Number(totalRows[0]?.total ?? 0);
      paymentRequests =
        pageIds.length === 0
          ? []
          : await this.prisma.paymentRequestModel.findMany({
              where: { id: { in: pageIds } },
              include,
            });
      const positionById = new Map(pageIds.map((id, index) => [id, index]));
      paymentRequests.sort((a, b) => (positionById.get(a.id) ?? 0) - (positionById.get(b.id) ?? 0));
    } else {
      paymentRequests = effectiveStatusFilter
        ? await this.prisma.paymentRequestModel.findMany({
            where: whereBase,
            include,
            orderBy,
            take: 2000,
          })
        : await this.prisma.paymentRequestModel.findMany({
            where: whereBase,
            include,
            orderBy,
            skip: (page - 1) * pageSize,
            take: pageSize,
          });
      if (effectiveStatusFilter) {
        total = 0;
      } else {
        total = await this.prisma.paymentRequestModel.count({ where: whereBase });
      }
    }

    const mappedItems = paymentRequests.map((paymentRequest) => {
      const latestTx =
        paymentRequest.ledgerEntries.find((entry) => entry.consumerId === consumerId) ??
        paymentRequest.ledgerEntries[0];
      const latestTxStatus = this.getEffectiveLedgerStatus(latestTx);
      const effectivePaymentStatus = this.getEffectivePaymentRequestStatus(paymentRequest.status, latestTx);
      const paymentRole =
        paymentRequest.payerId === consumerId ||
        (!paymentRequest.payerId &&
          normalizedConsumerEmail !== null &&
          paymentRequest.payerEmail?.trim().toLowerCase() === normalizedConsumerEmail)
          ? `PAYER`
          : `REQUESTER`;

      const counterparty = paymentRole === `PAYER` ? paymentRequest.requester : paymentRequest.payer;
      const counterpartyEmail =
        paymentRole === `PAYER`
          ? (paymentRequest.requester?.email ?? paymentRequest.requesterEmail ?? ``)
          : (paymentRequest.payer?.email ?? paymentRequest.payerEmail ?? ``);

      let latestTransaction;
      if (latestTx && latestTxStatus) {
        latestTransaction = {
          id: latestTx.id,
          status: normalizeConsumerFacingTransactionStatus(latestTxStatus),
          createdAt: latestTx.createdAt.toISOString(),
        };
      }

      return {
        id: paymentRequest.id,
        amount: Number(paymentRequest.amount),
        currencyCode: paymentRequest.currencyCode,
        status: normalizeConsumerFacingTransactionStatus(effectivePaymentStatus),
        role: paymentRole,
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

    if (effectiveStatusFilter && typeof this.prisma.$queryRaw !== `function`) {
      const filterSet =
        typeof effectiveStatusFilter === `object` && `in` in effectiveStatusFilter
          ? new Set(effectiveStatusFilter.in)
          : new Set([effectiveStatusFilter as $Enums.TransactionStatus]);
      const filteredItems = mappedItems.filter((item) => filterSet.has(item.status));
      return {
        items: filteredItems.slice((page - 1) * pageSize, page * pageSize),
        total: filteredItems.length,
        page,
        pageSize,
      };
    }

    return {
      items: mappedItems,
      total,
      page,
      pageSize,
    };
  }

  async getPaymentView(consumerId: string, paymentRequestId: string, backendBaseUrl?: string) {
    const consumerEmail = await this.getConsumerEmail(consumerId);
    const paymentRequest = await this.prisma.paymentRequestModel.findUnique({
      where: { id: paymentRequestId },
      include: {
        payer: { select: { id: true, email: true } },
        requester: { select: { id: true, email: true } },
        attachments: {
          orderBy: { createdAt: `desc` },
          include: {
            resource: {
              include: {
                resourceTags: {
                  include: { tag: true },
                },
              },
            },
          },
        },
        ledgerEntries: {
          orderBy: { createdAt: `asc` },
          include: {
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true },
            },
          },
        },
      },
    });

    if (!paymentRequest) {
      throw new NotFoundException(errorCodes.PAYMENT_REQUEST_NOT_FOUND_GET);
    }

    const isEmailOnlyPayer = this.isEmailOnlyParticipant(
      paymentRequest.payerId,
      paymentRequest.payerEmail,
      consumerEmail,
    );
    const isEmailOnlyRequester = this.isEmailOnlyParticipant(
      paymentRequest.requesterId,
      paymentRequest.requesterEmail,
      consumerEmail,
    );

    if (
      paymentRequest.payerId !== consumerId &&
      paymentRequest.requesterId !== consumerId &&
      !isEmailOnlyPayer &&
      !isEmailOnlyRequester
    ) {
      throw new ForbiddenException(errorCodes.PAYMENT_ACCESS_DENIED_GET);
    }

    const isPayer = paymentRequest.payerId === consumerId || isEmailOnlyPayer;
    const consumerLedgerEntry =
      paymentRequest.ledgerEntries
        .filter((entry) => entry.consumerId === consumerId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;

    return {
      id: paymentRequest.id,
      amount: Number(paymentRequest.amount),
      currencyCode: paymentRequest.currencyCode,
      status: normalizeConsumerFacingTransactionStatus(
        this.getEffectivePaymentRequestStatus(paymentRequest.status, consumerLedgerEntry),
      ),
      description: paymentRequest.description,
      dueDate: paymentRequest.dueDate,
      sentDate: paymentRequest.sentDate,
      createdAt: paymentRequest.createdAt,
      updatedAt: paymentRequest.updatedAt,

      role: isPayer ? `PAYER` : `REQUESTER`,

      payer: paymentRequest.payer ?? { id: null, email: paymentRequest.payerEmail ?? null },
      requester: paymentRequest.requester ?? { id: null, email: paymentRequest.requesterEmail ?? null },
      ledgerEntries: paymentRequest.ledgerEntries
        .filter((entry) => entry.consumerId === consumerId)
        .map((entry) => {
          const metadata = JSON.parse(JSON.stringify(entry.metadata || {}));
          const amount = Number(entry.amount);

          return {
            id: entry.id,
            ledgerId: entry.ledgerId,
            currencyCode: entry.currencyCode,
            amount,
            direction: amount > 0 ? PAYMENT_DIRECTION.INCOME : PAYMENT_DIRECTION.OUTCOME,
            status: normalizeConsumerFacingTransactionStatus(this.getEffectiveLedgerStatus(entry)!),
            type: this.normalizeProductLedgerType(entry.type, entry.paymentRequestId),
            createdAt: entry.createdAt,
            rail: metadata.rail ?? paymentRequest.paymentRail ?? null,
            counterpartyId: metadata.counterpartyId ?? null,
          };
        })
        .filter(
          (entry, index, self) =>
            index === self.findIndex((e) => e.ledgerId === entry.ledgerId && e.type === entry.type),
        ),

      attachments: paymentRequest.attachments
        .filter((attachment) => !this.isInvoiceResource(attachment.resource) || attachment.requesterId === consumerId)
        .map((att) => ({
          id: att.resource.id,
          name: att.resource.originalName,
          downloadUrl: buildConsumerDocumentDownloadUrl(att.resource.id, backendBaseUrl),
          size: att.resource.size,
          createdAt: att.resource.createdAt,
        })),
    };
  }

  async startPayment(consumerId: string, body: StartPayment, consumerAppScope?: ConsumerAppScope) {
    await this.ensureProfileComplete(consumerId);

    const normalizedEmail = body.email.trim().toLowerCase();
    const paymentCurrency = toCurrencyOrDefault(body.currencyCode, $Enums.CurrencyCode.USD);

    if (normalizedEmail === (await this.getConsumerEmail(consumerId))) {
      throw new BadRequestException(errorCodes.CANNOT_TRANSFER_TO_SELF_START_PAYMENT);
    }

    const recipient = await this.prisma.consumerModel.findFirst({
      where: {
        email: { equals: normalizedEmail, mode: `insensitive` },
        deletedAt: null,
      },
    });

    if (recipient?.id === consumerId) {
      throw new BadRequestException(errorCodes.CANNOT_TRANSFER_TO_SELF_START_PAYMENT);
    }

    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_START_PAYMENT);
    }

    const paymentRail =
      body.method === PAYMENT_METHOD.CREDIT_CARD ? $Enums.PaymentRail.CARD : $Enums.PaymentRail.BANK_TRANSFER;

    return this.prisma.$transaction(async (tx) => {
      const ledgerId = randomUUID();

      const paymentRequest = await tx.paymentRequestModel.create({
        data: {
          payerId: consumerId,
          requesterId: recipient?.id ?? null,
          requesterEmail: recipient?.email ?? normalizedEmail,
          currencyCode: paymentCurrency,
          paymentRail,
          amount,
          description: body.description ?? null,
          status: $Enums.TransactionStatus.PENDING,
          createdBy: consumerId,
          updatedBy: consumerId,
        },
      });

      await tx.ledgerEntryModel.create({
        data: {
          ledgerId,
          consumerId,
          paymentRequestId: paymentRequest.id,
          type: $Enums.LedgerEntryType.USER_PAYMENT,
          currencyCode: paymentCurrency,
          status: $Enums.TransactionStatus.PENDING,
          amount: -amount,
          createdBy: consumerId,
          updatedBy: consumerId,
          idempotencyKey: `pr:${paymentRequest.id}:payer`,
          metadata: appendConsumerAppScopeToMetadata(
            {
              rail: paymentRail,
              ...(recipient ? { counterpartyId: recipient.id } : {}),
            },
            consumerAppScope,
          ),
        },
      });

      if (recipient) {
        await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId: recipient.id,
            paymentRequestId: paymentRequest.id,
            type: this.getRequesterSettlementEntryType(paymentRail),
            currencyCode: paymentCurrency,
            status: $Enums.TransactionStatus.PENDING,
            amount: amount,
            createdBy: consumerId,
            updatedBy: consumerId,
            idempotencyKey: `pr:${paymentRequest.id}:requester`,
            metadata: appendConsumerAppScopeToMetadata(
              {
                rail: paymentRail,
                counterpartyId: consumerId,
              },
              consumerAppScope,
            ),
          },
        });
      } else {
        this.logger.log({
          event: `start_payment_created_without_registered_recipient`,
          paymentRequestId: paymentRequest.id,
          payerId: consumerId,
          requesterEmail: normalizedEmail,
        });
      }

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

  async sendPaymentRequest(consumerId: string, paymentRequestId: string, consumerAppScope?: ConsumerAppScope) {
    await this.ensureProfileComplete(consumerId);

    const result = await this.prisma.$transaction(async (tx) => {
      const paymentRequest = await tx.paymentRequestModel.findUnique({
        where: { id: paymentRequestId },
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

      if (paymentRequest._count.ledgerEntries === 0 && paymentRequest.payerId && paymentRequest.requesterId) {
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
            metadata: appendConsumerAppScopeToMetadata(
              {
                counterpartyId: paymentRequest.requesterId,
              },
              consumerAppScope,
            ),
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
            metadata: appendConsumerAppScopeToMetadata(
              {
                counterpartyId: paymentRequest.payerId,
              },
              consumerAppScope,
            ),
          },
        });
      }

      return {
        paymentRequestId: updated.id,
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
    });

    if (result.email.payerEmail) {
      await this.mailingService.sendPaymentRequestEmail({
        ...result.email,
        consumerAppScope,
      });
    }

    return { paymentRequestId: result.paymentRequestId };
  }

  async getBalancesCompleted(consumerId: string): Promise<Record<$Enums.CurrencyCode, number>> {
    try {
      const result = await this.balanceService.calculateMultiCurrency(consumerId, {
        mode: BalanceCalculationMode.COMPLETED,
      });
      return result.balances;
    } catch {
      this.logger.error(`Balance calculation failed`, { consumerId });
      throw new InternalServerErrorException(`An unexpected error occurred`);
    }
  }

  private async getConsumerEmail(consumerId: string): Promise<string | null> {
    const consumer = await this.prisma.consumerModel.findUnique({
      where: { id: consumerId },
      select: { email: true },
    });
    return consumer?.email?.trim().toLowerCase() ?? null;
  }

  private isEmailOnlyParticipant(
    participantId: string | null | undefined,
    participantEmail: string | null | undefined,
    consumerEmail: string | null,
  ): boolean {
    return (
      !participantId && !!participantEmail && !!consumerEmail && participantEmail.trim().toLowerCase() === consumerEmail
    );
  }

  private buildPaymentRoleConditions(
    consumerId: string,
    consumerEmail: string | null,
    role?: string,
  ): Prisma.PaymentRequestModelWhereInput[] {
    const payerConditions: Prisma.PaymentRequestModelWhereInput[] = [
      { payerId: consumerId },
      ...(consumerEmail
        ? [{ payerId: null, payerEmail: { equals: consumerEmail, mode: `insensitive` as const } }]
        : []),
    ];
    const requesterConditions: Prisma.PaymentRequestModelWhereInput[] = [
      { requesterId: consumerId },
      ...(consumerEmail
        ? [{ requesterId: null, requesterEmail: { equals: consumerEmail, mode: `insensitive` as const } }]
        : []),
    ];

    if (role === `PAYER`) return payerConditions;
    if (role === `REQUESTER`) return requesterConditions;
    return [...payerConditions, ...requesterConditions];
  }

  private buildPaymentRoleSql(consumerId: string, consumerEmail: string | null, role?: string): Prisma.Sql {
    const payerSql = consumerEmail
      ? Prisma.sql`(
          pr.payer_id::text = ${consumerId}
          OR (pr.payer_id IS NULL AND LOWER(COALESCE(pr.payer_email, '')) = ${consumerEmail})
        )`
      : Prisma.sql`(pr.payer_id::text = ${consumerId})`;
    const requesterSql = consumerEmail
      ? Prisma.sql`(
          pr.requester_id::text = ${consumerId}
          OR (pr.requester_id IS NULL AND LOWER(COALESCE(pr.requester_email, '')) = ${consumerEmail})
        )`
      : Prisma.sql`(pr.requester_id::text = ${consumerId})`;

    if (role === `PAYER`) return payerSql;
    if (role === `REQUESTER`) return requesterSql;
    return Prisma.sql`(${payerSql} OR ${requesterSql})`;
  }

  async getBalancesIncludePending(consumerId: string): Promise<Record<$Enums.CurrencyCode, number>> {
    try {
      const result = await this.balanceService.calculateMultiCurrency(consumerId, {
        mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
      });
      return result.balances;
    } catch {
      this.logger.error(`Balance calculation failed`, { consumerId });
      throw new InternalServerErrorException(`An unexpected error occurred`);
    }
  }

  async getAvailableBalance(consumerId: string): Promise<number> {
    const result = await this.balanceService.calculateSingle(consumerId);
    return result.balance;
  }

  private mapHistoryEntry(row: {
    id: string;
    ledgerId: string;
    type: $Enums.LedgerEntryType;
    status: $Enums.TransactionStatus;
    amount: Prisma.Decimal | number | string;
    currencyCode: $Enums.CurrencyCode;
    createdAt: Date;
    metadata: Prisma.JsonValue | null;
    paymentRequestId: string | null;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
    paymentRequest?: { paymentRail: $Enums.PaymentRail | null } | null;
  }) {
    const amount = Number(row.amount);
    const metadata = JSON.parse(JSON.stringify(row.metadata || {}));

    return {
      id: row.id,
      ledgerId: row.ledgerId,
      type: this.normalizeProductLedgerType(row.type, row.paymentRequestId),
      status: normalizeConsumerFacingTransactionStatus(this.getEffectiveLedgerStatus(row)!),
      currencyCode: row.currencyCode,
      amount,
      direction: amount > 0 ? PAYMENT_DIRECTION.INCOME : PAYMENT_DIRECTION.OUTCOME,
      createdAt: row.createdAt,
      rail: metadata.rail ?? row.paymentRequest?.paymentRail ?? null,
      paymentMethodId: metadata.paymentMethodId ?? null,
      paymentRequestId: row.paymentRequestId ?? null,
    };
  }

  async getHistory(consumerId: string, query: PaymentsHistoryQuery) {
    const { direction, status, type, limit = 20, offset = 0 } = query;
    let items: ReturnType<ConsumerPaymentsService[`mapHistoryEntry`]>[];
    let total: number;

    if (typeof this.prisma.$queryRaw === `function`) {
      const effectiveStatusFilter = buildConsumerStatusFilter(status);
      const directionSql =
        direction === PAYMENT_DIRECTION.INCOME
          ? Prisma.sql`AND latest.amount > 0`
          : direction === PAYMENT_DIRECTION.OUTCOME
            ? Prisma.sql`AND latest.amount < 0`
            : Prisma.empty;
      const statusSql = !effectiveStatusFilter
        ? Prisma.empty
        : typeof effectiveStatusFilter === `object` && `in` in effectiveStatusFilter
          ? Prisma.sql`AND latest."effectiveStatus" IN (${Prisma.join(effectiveStatusFilter.in)})`
          : Prisma.sql`AND latest."effectiveStatus" = ${effectiveStatusFilter}`;
      const typeSql = type ? Prisma.sql`AND latest."normalizedType" = ${type}` : Prisma.empty;
      const rows = await this.prisma.$queryRaw<
        Array<{
          id: string;
          ledgerId: string;
          type: $Enums.LedgerEntryType;
          effectiveStatus: $Enums.TransactionStatus;
          amount: Prisma.Decimal | number | string;
          currencyCode: $Enums.CurrencyCode;
          createdAt: Date;
          metadata: Prisma.JsonValue | null;
          paymentRequestId: string | null;
          paymentRail: $Enums.PaymentRail | null;
          totalRows: number;
        }>
      >(Prisma.sql`
        WITH latest_entries AS (
          SELECT DISTINCT ON (le.ledger_id)
            le.id,
            le.ledger_id AS "ledgerId",
            le.type,
            CASE
              WHEN le.payment_request_id IS NOT NULL AND le.type::text = ${$Enums.LedgerEntryType.USER_DEPOSIT}
                THEN ${$Enums.LedgerEntryType.USER_PAYMENT}::text
              WHEN le.payment_request_id IS NOT NULL AND le.type::text = ${$Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL}
                THEN ${$Enums.LedgerEntryType.USER_PAYMENT_REVERSAL}::text
              ELSE le.type::text
            END AS "normalizedType",
            COALESCE(latest_outcome.status::text, le.status::text) AS "effectiveStatus",
            le.amount,
            le.currency_code AS "currencyCode",
            le.created_at AS "createdAt",
            le.metadata,
            le.payment_request_id AS "paymentRequestId",
            pr.payment_rail AS "paymentRail"
          FROM ledger_entry le
          LEFT JOIN payment_request pr ON pr.id = le.payment_request_id
          LEFT JOIN LATERAL (
            SELECT leo.status
            FROM ledger_entry_outcome leo
            WHERE leo.ledger_entry_id = le.id
            ORDER BY leo.created_at DESC, leo.id DESC
            LIMIT 1
          ) latest_outcome ON true
          WHERE le.consumer_id::text = ${consumerId}
            AND le.deleted_at IS NULL
          ORDER BY le.ledger_id, le.created_at DESC, le.id DESC
        ),
        filtered AS (
          SELECT *
          FROM latest_entries latest
          WHERE 1 = 1
            ${directionSql}
            ${statusSql}
            ${typeSql}
        )
        SELECT
          latest.id,
          latest."ledgerId",
          latest.type,
          latest."effectiveStatus",
          latest.amount,
          latest."currencyCode",
          latest."createdAt",
          latest.metadata,
          latest."paymentRequestId",
          latest."paymentRail",
          COUNT(*) OVER()::int AS "totalRows"
        FROM filtered latest
        ORDER BY latest."createdAt" DESC, latest.id DESC
        OFFSET ${offset}
        LIMIT ${limit}
      `);
      items = rows.map((row) =>
        this.mapHistoryEntry({
          id: row.id,
          ledgerId: row.ledgerId,
          type: row.type,
          status: normalizeConsumerFacingTransactionStatus(row.effectiveStatus),
          amount: row.amount,
          currencyCode: row.currencyCode,
          createdAt: new Date(row.createdAt),
          metadata: row.metadata,
          paymentRequestId: row.paymentRequestId,
          outcomes: [],
          paymentRequest: { paymentRail: row.paymentRail },
        }),
      );
      total = Number(rows[0]?.totalRows ?? 0);
    } else {
      const where: Prisma.LedgerEntryModelWhereInput = { consumerId, deletedAt: null };
      const batchSize = Math.max(offset + limit + 50, 200);
      const latestEntryByLedgerId = new Map<string, ReturnType<ConsumerPaymentsService[`mapHistoryEntry`]>>();

      for (let skip = 0; ; skip += batchSize) {
        const rows = await this.prisma.ledgerEntryModel.findMany({
          where,
          orderBy: [{ createdAt: `desc` }, { id: `desc` }],
          skip,
          take: batchSize,
          include: {
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true },
            },
            paymentRequest: {
              select: { paymentRail: true },
            },
          },
        });

        for (const row of rows) {
          if (!latestEntryByLedgerId.has(row.ledgerId)) {
            latestEntryByLedgerId.set(row.ledgerId, this.mapHistoryEntry(row));
          }
        }

        if (rows.length < batchSize) {
          break;
        }
      }

      const filteredItems = Array.from(latestEntryByLedgerId.values())
        .filter((entry) => !direction || entry.direction === direction)
        .filter((entry) => !status || entry.status === status)
        .filter((entry) => !type || entry.type === type)
        .sort((a, b) => {
          const createdAtDiff = b.createdAt.getTime() - a.createdAt.getTime();
          if (createdAtDiff !== 0) return createdAtDiff;
          return b.id.localeCompare(a.id);
        });

      items = filteredItems.slice(offset, offset + limit);
      total = filteredItems.length;
    }

    const paymentMethodIds = Array.from(
      new Set(
        items
          .map((item) => item.paymentMethodId)
          .filter(
            (paymentMethodId): paymentMethodId is string =>
              typeof paymentMethodId === `string` && paymentMethodId.length > 0,
          ),
      ),
    );
    const paymentMethodLabelById = new Map<string, string>();

    if (paymentMethodIds.length > 0) {
      const paymentMethods = await this.prisma.paymentMethodModel.findMany({
        where: {
          id: { in: paymentMethodIds },
          consumerId,
        },
        select: {
          id: true,
          brand: true,
          last4: true,
        },
      });

      for (const paymentMethod of paymentMethods) {
        const brand = paymentMethod.brand || `Bank account`;
        const last4 = paymentMethod.last4 ? ` •••• ${paymentMethod.last4}` : ``;
        const label = `${brand}${last4}`;
        paymentMethodLabelById.set(paymentMethod.id, label);
      }
    }

    return {
      items: items.map((item) => ({
        ...item,
        paymentMethodLabel: item.paymentMethodId ? (paymentMethodLabelById.get(item.paymentMethodId) ?? null) : null,
      })),
      total,
      limit,
      offset,
    };
  }

  private async getKycLimits(
    consumerId: string,
    db: Pick<Prisma.TransactionClient, `consumerModel`> | Pick<PrismaService, `consumerModel`> = this.prisma,
  ) {
    const consumer = await db.consumerModel.findUnique({
      where: { id: consumerId },
      select: {
        legalVerified: true,
        verificationStatus: true,
      },
    });

    const isVerified = consumer ? isConsumerVerificationEffective(consumer) : false;

    return {
      maxPerOperation: isVerified ? 10_000 : 1_000,
      dailyLimit: isVerified ? 50_000 : 5_000,
    };
  }

  private async getTodayOutgoingTotal(
    consumerId: string,
    db: Pick<Prisma.TransactionClient, `$queryRaw`> | Pick<PrismaService, `$queryRaw`> = this.prisma,
  ) {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const walletEligibilityCondition = buildWalletEligibilityCondition();

    const rows = await db.$queryRaw<Array<{ total: string | null }>>(Prisma.sql`
      SELECT COALESCE(SUM(le.amount), 0) AS total
      FROM ledger_entry le
      LEFT JOIN payment_request pr ON pr.id = le.payment_request_id
      LEFT JOIN LATERAL (
        SELECT o.status FROM ledger_entry_outcome o
        WHERE o.ledger_entry_id = le.id
        ORDER BY o.created_at DESC LIMIT 1
      ) latest ON true
      WHERE le.consumer_id::text = ${consumerId}
        AND le.amount < 0
        AND le.type::text IN (${Prisma.join(
          [$Enums.LedgerEntryType.USER_PAYMENT, $Enums.LedgerEntryType.USER_PAYOUT],
          `, `,
        )})
        AND le.created_at >= ${start}
        AND ((COALESCE(latest.status, le.status))::text = ${$Enums.TransactionStatus.PENDING}
             OR (COALESCE(latest.status, le.status))::text = ${$Enums.TransactionStatus.COMPLETED})
        AND le.deleted_at IS NULL
        ${walletEligibilityCondition}
    `);
    return Math.abs(Number(rows[0]?.total ?? 0));
  }

  private async ensureLimits(
    consumerId: string,
    amount: number,
    db:
      | Pick<Prisma.TransactionClient, `consumerModel` | `$queryRaw`>
      | Pick<PrismaService, `consumerModel` | `$queryRaw`> = this.prisma,
  ) {
    const { maxPerOperation, dailyLimit } = await this.getKycLimits(consumerId, db);

    if (amount > maxPerOperation) {
      throw new BadRequestException(errorCodes.AMOUNT_EXCEEDS_PER_OPERATION_LIMIT);
    }

    const todayTotal = await this.getTodayOutgoingTotal(consumerId, db);
    if (todayTotal + amount > dailyLimit) {
      throw new BadRequestException(errorCodes.AMOUNT_EXCEEDS_DAILY_LIMIT);
    }
  }

  async withdraw(consumerId: string, body: WithdrawBody, idempotencyKey: string | undefined) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_WITHDRAW);
    }
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_WITHDRAW);
    }

    const key = idempotencyKey.trim();
    const withdrawCurrency = toCurrencyOrDefault(body.currencyCode ?? body.currency, $Enums.CurrencyCode.USD);

    const existing = await this.prisma.ledgerEntryModel.findFirst({
      where: {
        idempotencyKey: `withdraw:${key}`,
        consumerId,
        type: $Enums.LedgerEntryType.USER_PAYOUT,
        deletedAt: null,
      },
    });
    if (existing) return existing;

    if (body.paymentMethodId?.trim()) {
      const payoutMethod = await this.prisma.paymentMethodModel.findFirst({
        where: {
          id: body.paymentMethodId.trim(),
          consumerId,
          deletedAt: null,
        },
        select: { id: true, type: true },
      });
      if (!payoutMethod || payoutMethod.type !== $Enums.PaymentMethodType.BANK_ACCOUNT) {
        throw new BadRequestException(errorCodes.PAYMENT_METHOD_NOT_FOUND);
      }
    }

    const ledgerId = randomUUID();

    try {
      return await this.prisma.$transaction(async (tx) => {
        await this.lockConsumerOutgoing(tx, consumerId);

        await tx.$executeRaw(Prisma.sql`
          SELECT pg_advisory_xact_lock(hashtext((${consumerId} || ':withdraw')::text)::bigint)
        `);

        await this.ensureLimits(consumerId, amount, tx);

        const balance = await this.balanceService.calculateInTransaction(tx, consumerId, withdrawCurrency, {
          mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
        });
        if (amount > balance) {
          throw new BadRequestException(errorCodes.INSUFFICIENT_BALANCE_WITHDRAW);
        }

        const payoutEntry = await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId,
            type: $Enums.LedgerEntryType.USER_PAYOUT,
            currencyCode: withdrawCurrency,
            status: $Enums.TransactionStatus.PENDING,
            amount: -amount,
            createdBy: consumerId,
            updatedBy: consumerId,
            idempotencyKey: `withdraw:${key}`,
            metadata: {
              rail: $Enums.PaymentRail.BANK_TRANSFER,
              requesterId: consumerId,
              ...(body.paymentMethodId?.trim() ? { paymentMethodId: body.paymentMethodId.trim() } : {}),
              ...(body.note?.trim() ? { note: body.note.trim() } : {}),
            },
          },
        });

        return payoutEntry;
      });
    } catch (err) {
      if (err instanceof BadRequestException) throw err;
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002` && key) {
        const existingWithdraw = await this.prisma.ledgerEntryModel.findFirst({
          where: {
            idempotencyKey: `withdraw:${key}`,
            consumerId,
            type: $Enums.LedgerEntryType.USER_PAYOUT,
            deletedAt: null,
          },
        });
        if (existingWithdraw) return existingWithdraw;
      }
      this.logger.error(`Withdraw failed`, { consumerId });
      throw new InternalServerErrorException(`An unexpected error occurred`);
    }
  }

  async transfer(consumerId: string, body: TransferBody, idempotencyKey: string | undefined) {
    const amount = Number(body.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException(errorCodes.INVALID_AMOUNT_TRANSFER);
    }
    if (!idempotencyKey?.trim()) {
      throw new BadRequestException(errorCodes.IDEMPOTENCY_KEY_REQUIRED_TRANSFER);
    }

    const key = idempotencyKey.trim();

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

    const recipient = await this.prisma.consumerModel.findFirst({
      where: this.buildTransferRecipientWhere(body),
    });

    if (!recipient) {
      throw new NotFoundException(errorCodes.RECIPIENT_NOT_FOUND_TRANSFER);
    }

    if (recipient.id === consumerId) {
      throw new BadRequestException(errorCodes.CANNOT_TRANSFER_TO_SELF_TRANSFER);
    }

    const ledgerId = randomUUID();
    const [firstId, secondId] = [consumerId, recipient.id].sort();

    try {
      return await this.prisma.$transaction(async (tx) => {
        const transferCurrency = toCurrencyOrDefault(body.currencyCode ?? body.currency, $Enums.CurrencyCode.USD);

        await this.lockConsumerOutgoing(tx, consumerId);

        await tx.$executeRaw(Prisma.sql`
          SELECT pg_advisory_xact_lock(hashtext((${firstId} || ':transfer')::text)::bigint)
        `);
        await tx.$executeRaw(Prisma.sql`
          SELECT pg_advisory_xact_lock(hashtext((${secondId} || ':transfer')::text)::bigint)
        `);

        await this.ensureLimits(consumerId, amount, tx);

        const balance = await this.balanceService.calculateInTransaction(tx, consumerId, transferCurrency, {
          mode: BalanceCalculationMode.COMPLETED_AND_PENDING,
        });
        if (amount > balance) {
          throw new BadRequestException(errorCodes.INSUFFICIENT_BALANCE_TRANSFER);
        }

        await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            currencyCode: transferCurrency,
            status: $Enums.TransactionStatus.COMPLETED,
            amount: -amount,
            createdBy: consumerId,
            updatedBy: consumerId,
            idempotencyKey: `transfer:${key}:sender`,
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
            currencyCode: transferCurrency,
            status: $Enums.TransactionStatus.COMPLETED,
            amount: +amount,
            createdBy: consumerId,
            updatedBy: consumerId,
            idempotencyKey: `transfer:${key}:recipient`,
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
        const existingTransfer = await this.prisma.ledgerEntryModel.findFirst({
          where: {
            idempotencyKey: `transfer:${key}:sender`,
            consumerId,
            type: $Enums.LedgerEntryType.USER_PAYMENT,
            deletedAt: null,
          },
          select: { ledgerId: true },
        });
        if (existingTransfer) return { ledgerId: existingTransfer.ledgerId };
      }
      this.logger.error(`Transfer failed`, { consumerId });
      throw new InternalServerErrorException(`An unexpected error occurred`);
    }
  }
}
