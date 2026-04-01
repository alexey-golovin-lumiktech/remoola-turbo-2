import { createHash, randomUUID } from 'crypto';

import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import Stripe from 'stripe';

import { $Enums, Prisma } from '@remoola/database-2';
import { adminErrorCodes, errorCodes } from '@remoola/shared-constants';

import { type PaymentReversalCreate } from './dto';
import { envs } from '../../../envs';
import { AdminActionAuditService, ADMIN_ACTION_AUDIT_ACTIONS } from '../../../shared/admin-action-audit.service';
import { BalanceCalculationService } from '../../../shared/balance-calculation.service';
import { MailingService } from '../../../shared/mailing.service';
import { PrismaService } from '../../../shared/prisma.service';
import { getCurrencyFractionDigits } from '../../../shared-common';

const PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES = [
  $Enums.LedgerEntryType.USER_PAYMENT,
  $Enums.LedgerEntryType.USER_DEPOSIT,
] as const;
const PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES = [
  $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
  $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL,
] as const;

@Injectable()
export class AdminPaymentRequestsService {
  private readonly logger = new Logger(AdminPaymentRequestsService.name);
  private stripe: Stripe;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mailingService: MailingService,
    private readonly balanceService: BalanceCalculationService,
    private readonly adminActionAudit: AdminActionAuditService,
  ) {
    this.stripe = new Stripe(envs.STRIPE_SECRET_KEY, { apiVersion: `2025-11-17.clover` });
  }

  private static readonly SEARCH_MAX_LEN = 200;
  private static readonly TRANSACTION_STATUSES = Object.values($Enums.TransactionStatus) as string[];

  private getEffectiveLedgerStatus(entry: {
    status: $Enums.TransactionStatus;
    outcomes?: Array<{ status: $Enums.TransactionStatus }>;
  }): $Enums.TransactionStatus {
    return entry.outcomes?.[0]?.status ?? entry.status;
  }

  private derivePaymentRail(
    paymentRequest:
      | {
          paymentRail?: $Enums.PaymentRail | null;
          ledgerEntries?: Array<{
            type: $Enums.LedgerEntryType;
            metadata?: Prisma.JsonValue | null;
          }>;
        }
      | null
      | undefined,
  ): $Enums.PaymentRail | null {
    if (!paymentRequest) return null;
    if (paymentRequest.paymentRail) return paymentRequest.paymentRail;

    for (const entry of paymentRequest.ledgerEntries ?? []) {
      if (!(PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES as readonly $Enums.LedgerEntryType[]).includes(entry.type)) continue;
      const metadata = JSON.parse(JSON.stringify(entry.metadata ?? {})) as { rail?: $Enums.PaymentRail | null };
      if (metadata.rail) return metadata.rail;
    }

    return null;
  }

  private deriveEffectivePaymentRequestStatus(
    paymentRequest:
      | {
          status: $Enums.TransactionStatus;
          ledgerEntries?: Array<{
            status: $Enums.TransactionStatus;
            createdAt: Date;
            outcomes?: Array<{ status: $Enums.TransactionStatus }>;
          }>;
        }
      | null
      | undefined,
  ): $Enums.TransactionStatus | null {
    if (!paymentRequest) return null;
    const latestEntry = [...(paymentRequest.ledgerEntries ?? [])].sort(
      (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
    )[0];
    return latestEntry ? this.getEffectiveLedgerStatus(latestEntry) : paymentRequest.status;
  }

  private getRequesterReversalEntryType(params: {
    settlementEntryType: $Enums.LedgerEntryType | null | undefined;
    paymentRail?: $Enums.PaymentRail | null;
  }): $Enums.LedgerEntryType {
    return params.settlementEntryType === $Enums.LedgerEntryType.USER_DEPOSIT ||
      params.paymentRail === $Enums.PaymentRail.CARD
      ? $Enums.LedgerEntryType.USER_DEPOSIT_REVERSAL
      : $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL;
  }

  private async findExistingReversal(
    idempotencyKeyBase: string,
    remaining: number,
    kind: PaymentReversalCreate[`kind`],
  ) {
    const existingReversal = await this.prisma.ledgerEntryModel.findFirst({
      where: { idempotencyKey: `${idempotencyKeyBase}:payer` },
      select: { ledgerId: true, amount: true },
    });
    if (!existingReversal) {
      return null;
    }
    return {
      ledgerId: existingReversal.ledgerId,
      amount: Number(existingReversal.amount),
      remaining: Math.max(0, remaining - Number(existingReversal.amount)),
      kind,
    };
  }

  private async resolveStripePaymentIntentId(paymentRequestId: string): Promise<string | null> {
    const stripePayment = await this.prisma.ledgerEntryModel.findFirst({
      where: {
        paymentRequestId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        stripeId: { not: null },
      },
      select: { stripeId: true },
      orderBy: { createdAt: `desc` },
    });
    if (stripePayment?.stripeId) return stripePayment.stripeId;

    const byOutcome = await this.prisma.ledgerEntryOutcomeModel.findFirst({
      where: {
        status: $Enums.TransactionStatus.COMPLETED,
        source: `stripe`,
        externalId: { not: null },
        ledgerEntry: {
          paymentRequestId,
          type: { in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] },
        },
      },
      orderBy: { createdAt: `desc` },
      select: { externalId: true },
    });
    return byOutcome?.externalId ?? null;
  }

  /** Bounded list for admin. Default cap 500. Search/filter fintech-safe (bounded, Prisma-only). */
  async findAllPaymentRequests(params?: {
    page?: number;
    pageSize?: number;
    q?: string;
    status?: string;
    includeDeleted?: boolean;
  }) {
    const pageSize = Math.min(Math.max(params?.pageSize ?? 10, 1), 500);
    const page = Math.max(params?.page ?? 1, 1);
    const skip = (page - 1) * pageSize;

    const search =
      typeof params?.q === `string` && params.q.trim().length > 0
        ? params.q.trim().slice(0, AdminPaymentRequestsService.SEARCH_MAX_LEN)
        : undefined;
    const status =
      params?.status && AdminPaymentRequestsService.TRANSACTION_STATUSES.includes(params.status)
        ? (params.status as $Enums.TransactionStatus)
        : undefined;

    const whereBase: Prisma.PaymentRequestModelWhereInput = {
      ...(params?.includeDeleted !== true && { deletedAt: null }),
      ...(search && {
        OR: [
          { description: { contains: search, mode: `insensitive` } },
          { payerEmail: { contains: search, mode: `insensitive` } },
          { payer: { email: { contains: search, mode: `insensitive` } } },
          { requester: { email: { contains: search, mode: `insensitive` } } },
          ...(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search)
            ? [{ id: { equals: search } }]
            : []),
        ],
      }),
    };

    const include = {
      payer: { select: { id: true, email: true } },
      requester: { select: { id: true, email: true } },
      ledgerEntries: {
        where: { type: { in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] } },
        orderBy: { createdAt: `desc` as const },
        select: {
          type: true,
          metadata: true,
          status: true,
          createdAt: true,
          outcomes: {
            orderBy: { createdAt: `desc` as const },
            take: 1,
            select: { status: true },
          },
        },
        take: 4,
      },
    };

    const orderBy = { createdAt: `desc` as const };
    type PaymentRequestWithInclude = Prisma.PaymentRequestModelGetPayload<{ include: typeof include }>;
    let fetchedItems: PaymentRequestWithInclude[] = [];
    let total = 0;

    const useDbBackedStatusFilter = status && typeof this.prisma.$queryRaw === `function`;

    if (useDbBackedStatusFilter) {
      const searchPattern = search ? `%${search}%` : null;
      const deletedSql = params?.includeDeleted === true ? Prisma.empty : Prisma.sql`AND pr.deleted_at IS NULL`;
      const searchSql = searchPattern
        ? Prisma.sql`
            AND (
              LOWER(COALESCE(pr.description, '')) LIKE LOWER(${searchPattern})
              OR LOWER(COALESCE(pr.payer_email, '')) LIKE LOWER(${searchPattern})
              OR LOWER(COALESCE(payer.email, '')) LIKE LOWER(${searchPattern})
              OR LOWER(COALESCE(requester.email, '')) LIKE LOWER(${searchPattern})
              ${
                /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(search ?? ``)
                  ? Prisma.sql`OR pr.id::text = ${search}`
                  : Prisma.empty
              }
            )
          `
        : Prisma.empty;
      const filteredPaymentIdsSql = Prisma.sql`
        SELECT pr.id, pr.created_at
        FROM payment_request pr
        LEFT JOIN consumer payer ON payer.id = pr.payer_id
        LEFT JOIN consumer requester ON requester.id = pr.requester_id
        LEFT JOIN LATERAL (
          SELECT le.id, le.status
          FROM ledger_entry le
          WHERE le.payment_request_id = pr.id
            AND le.type IN (${Prisma.join([...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES])})
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
        WHERE COALESCE(latest_outcome.status::text, latest_le.status::text, pr.status::text) = ${status}
          ${deletedSql}
          ${searchSql}
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
          OFFSET ${skip}
          LIMIT ${pageSize}
        `),
      ]);
      const pageIds = pageIdRows.map((row) => row.id);
      total = Number(totalRows[0]?.total ?? 0);
      fetchedItems =
        pageIds.length === 0
          ? []
          : await this.prisma.paymentRequestModel.findMany({
              where: { id: { in: pageIds } },
              include,
            });
      const positionById = new Map(pageIds.map((id, index) => [id, index]));
      fetchedItems.sort((left, right) => (positionById.get(left.id) ?? 0) - (positionById.get(right.id) ?? 0));
    } else {
      if (status) {
        fetchedItems = await this.prisma.paymentRequestModel.findMany({
          where: whereBase,
          orderBy,
          take: 2000,
          include,
        });
      } else {
        [total, fetchedItems] = await Promise.all([
          this.prisma.paymentRequestModel.count({ where: whereBase }),
          this.prisma.paymentRequestModel.findMany({
            where: whereBase,
            orderBy,
            skip,
            take: pageSize,
            include,
          }),
        ]);
      }
    }

    const mappedItems = fetchedItems.map((item) => ({
      ...item,
      status: this.deriveEffectivePaymentRequestStatus(item) ?? item.status,
      paymentRail: this.derivePaymentRail(item),
    }));
    const items = useDbBackedStatusFilter
      ? mappedItems
      : status
        ? mappedItems.filter((item) => item.status === status)
        : mappedItems;
    if (status && !useDbBackedStatusFilter) {
      total = items.length;
    }

    return {
      items: status && !useDbBackedStatusFilter ? items.slice(skip, skip + pageSize) : items,
      total,
      page,
      pageSize,
    };
  }

  async getById(id: string) {
    const item = await this.prisma.paymentRequestModel.findUnique({
      where: { id },
      include: {
        payer: { select: { id: true, email: true } },
        requester: { select: { id: true, email: true } },
        ledgerEntries: {
          where: { type: { in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] } },
          orderBy: { createdAt: `desc` },
          select: {
            type: true,
            metadata: true,
            status: true,
            createdAt: true,
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true },
            },
          },
          take: 4,
        },
      },
    });
    return item
      ? {
          ...item,
          status: this.deriveEffectivePaymentRequestStatus(item) ?? item.status,
          paymentRail: this.derivePaymentRail(item),
        }
      : null;
  }

  async getExpectationDateArchive(params: { query?: string; page?: number; pageSize?: number }) {
    const { query } = params;
    const page = Math.max(1, params.page ?? 1);
    const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 10));
    const offset = (page - 1) * pageSize;

    const whereClauses: Prisma.Sql[] = [];
    const searchQuery =
      typeof query === `string` && query.trim().length > 0
        ? query.trim().slice(0, AdminPaymentRequestsService.SEARCH_MAX_LEN)
        : undefined;
    if (searchQuery) {
      whereClauses.push(Prisma.sql`a.payment_request_id::text ILIKE ${`%${searchQuery}%`}`);
    }

    // Built from Prisma.sql fragments only (parameterized); raw-sql-issues.md
    const whereSql = whereClauses.length > 0 ? Prisma.sql`WHERE ${Prisma.join(whereClauses, ` AND `)}` : Prisma.empty;

    type ArchiveRow = {
      id: bigint | number;
      paymentRequestId: string;
      expectationDate: Date;
      archivedAt: Date;
      migrationTag: string;
      paymentRequestExists: boolean;
    };

    type CountRow = { count: bigint };

    let total = 0;
    let rows: ArchiveRow[] = [];
    try {
      // payment_request_expectation_date_archive: raw table (no Prisma model); raw-sql-issues.md
      const countQuery = Prisma.sql`
        SELECT COUNT(*)::bigint AS count
        FROM payment_request_expectation_date_archive a
        LEFT JOIN payment_request pr ON pr.id = a.payment_request_id
      `;
      const rowsQuery = Prisma.sql`
        SELECT
          a.id,
          a.payment_request_id AS "paymentRequestId",
          a.expectation_date AS "expectationDate",
          a.archived_at AS "archivedAt",
          a.migration_tag AS "migrationTag",
          (pr.id IS NOT NULL) AS "paymentRequestExists"
        FROM payment_request_expectation_date_archive a
        LEFT JOIN payment_request pr ON pr.id = a.payment_request_id
      `;

      const [countResult, rowsResult] = await Promise.all([
        this.prisma.$queryRaw<CountRow[]>(whereClauses.length > 0 ? Prisma.sql`${countQuery} ${whereSql}` : countQuery),
        this.prisma.$queryRaw<ArchiveRow[]>(
          /* eslint-disable */
          whereClauses.length > 0
            ? Prisma.sql`${rowsQuery} ${whereSql} ORDER BY a.archived_at DESC, a.id DESC LIMIT ${pageSize} OFFSET ${offset}`
            : Prisma.sql`${rowsQuery} ORDER BY a.archived_at DESC, a.id DESC LIMIT ${pageSize} OFFSET ${offset}`,
          /* eslint-enable */
        ),
      ]);
      total = Number(countResult[0]?.count ?? 0);
      rows = rowsResult;
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes(`payment_request_expectation_date_archive`)) {
        total = 0;
        rows = [];
      } else {
        throw error;
      }
    }

    const items = rows.map((row) => ({
      id: String(row.id),
      paymentRequestId: row.paymentRequestId,
      expectationDate: row.expectationDate,
      archivedAt: row.archivedAt,
      migrationTag: row.migrationTag,
      paymentRequestExists: row.paymentRequestExists,
    }));

    return { items, total, page, pageSize };
  }

  private buildReversalIdempotencyKey(payload: {
    paymentRequestId: string;
    kind: PaymentReversalCreate[`kind`];
    amount: number;
    adminId: string;
    reason?: string | null;
  }) {
    const normalized = JSON.stringify({
      ...payload,
      reason: payload.reason?.trim() || null,
    });
    return createHash(`sha256`).update(normalized).digest(`hex`);
  }

  private async sendReversalEmails(params: {
    paymentRequestId: string;
    payerId: string;
    requesterId: string | null;
    requesterEmail?: string | null;
    amount: number;
    currencyCode: $Enums.CurrencyCode;
    kind: PaymentReversalCreate[`kind`];
    reason?: string | null;
  }) {
    const { paymentRequestId, payerId, requesterId, requesterEmail, amount, currencyCode, kind, reason } = params;
    const consumerIds = [payerId, ...(requesterId ? [requesterId] : [])];
    const consumers = await this.prisma.consumerModel.findMany({
      where: { id: { in: consumerIds } },
      select: { id: true, email: true },
    });

    const payer = consumers.find((consumer) => consumer.id === payerId);
    const requester = requesterId ? consumers.find((consumer) => consumer.id === requesterId) : null;
    const requesterEmailResolved = requester?.email ?? requesterEmail ?? ``;

    if (!payer?.email) return;

    if (kind === `REFUND`) {
      await this.mailingService.sendPaymentRefundEmail({
        recipientEmail: payer.email,
        counterpartyEmail: requesterEmailResolved,
        amount,
        currencyCode,
        reason,
        paymentRequestId,
        role: `payer`,
      });
      if (requesterEmailResolved) {
        await this.mailingService.sendPaymentRefundEmail({
          recipientEmail: requesterEmailResolved,
          counterpartyEmail: payer.email,
          amount,
          currencyCode,
          reason,
          paymentRequestId,
          role: `requester`,
        });
      }
      return;
    }

    await this.mailingService.sendPaymentChargebackEmail({
      recipientEmail: payer.email,
      counterpartyEmail: requesterEmailResolved,
      amount,
      currencyCode,
      reason,
      paymentRequestId,
      role: `payer`,
    });
    if (requesterEmailResolved) {
      await this.mailingService.sendPaymentChargebackEmail({
        recipientEmail: requesterEmailResolved,
        counterpartyEmail: payer.email,
        amount,
        currencyCode,
        reason,
        paymentRequestId,
        role: `requester`,
      });
    }
  }

  async createReversal(paymentRequestId: string, body: PaymentReversalCreate, adminId: string) {
    const paymentRequest = await this.prisma.paymentRequestModel.findUnique({
      where: { id: paymentRequestId },
      select: {
        id: true,
        amount: true,
        currencyCode: true,
        status: true,
        payerId: true,
        requesterId: true,
        requesterEmail: true,
        ledgerEntries: {
          where: { type: { in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] } },
          select: {
            ledgerId: true,
            type: true,
            status: true,
            createdAt: true,
            outcomes: {
              orderBy: { createdAt: `desc` },
              take: 1,
              select: { status: true },
            },
          },
        },
      },
    });

    if (!paymentRequest) throw new NotFoundException(adminErrorCodes.ADMIN_PAYMENT_REQUEST_NOT_FOUND);

    if (!paymentRequest.payerId) {
      throw new BadRequestException(adminErrorCodes.ADMIN_PAYMENT_REQUEST_NOT_FOUND);
    }

    if (this.deriveEffectivePaymentRequestStatus(paymentRequest) !== $Enums.TransactionStatus.COMPLETED) {
      throw new BadRequestException(adminErrorCodes.ADMIN_ONLY_COMPLETED_CAN_BE_REVERSED);
    }

    const requestAmount = Number(paymentRequest.amount);
    if (!Number.isFinite(requestAmount) || requestAmount <= 0) {
      throw new BadRequestException(adminErrorCodes.ADMIN_INVALID_PAYMENT_AMOUNT);
    }

    const requestedAmount = body.amount != null ? Number(body.amount) : undefined;
    if (requestedAmount != null && (!Number.isFinite(requestedAmount) || requestedAmount <= 0)) {
      throw new BadRequestException(adminErrorCodes.ADMIN_INVALID_REVERSAL_AMOUNT);
    }

    const originalLedgerId = paymentRequest.ledgerEntries.find(
      (entry) =>
        entry.type === $Enums.LedgerEntryType.USER_PAYMENT &&
        this.getEffectiveLedgerStatus(entry) === $Enums.TransactionStatus.COMPLETED,
    )?.ledgerId;

    const stripePaymentIntentId = await this.resolveStripePaymentIntentId(paymentRequestId);
    const requesterSettlementEntry = paymentRequest.requesterId
      ? await this.prisma.ledgerEntryModel.findFirst({
          where: {
            paymentRequestId,
            consumerId: paymentRequest.requesterId,
            amount: { gt: 0 },
            type: { in: [...PAYMENT_REQUEST_SETTLEMENT_ENTRY_TYPES] },
          },
          select: {
            type: true,
            ledgerId: true,
            paymentRequest: {
              select: {
                paymentRail: true,
              },
            },
          },
          orderBy: { createdAt: `desc` },
        })
      : null;
    const requesterReversalType = this.getRequesterReversalEntryType({
      settlementEntryType: requesterSettlementEntry?.type,
      paymentRail: requesterSettlementEntry?.paymentRequest?.paymentRail ?? null,
    });

    const reversalEntries = await this.prisma.ledgerEntryModel.findMany({
      where: {
        paymentRequestId,
        type: { in: [...PAYMENT_REQUEST_REVERSAL_ENTRY_TYPES] },
      },
      select: {
        amount: true,
        status: true,
        outcomes: {
          orderBy: { createdAt: `desc` },
          take: 1,
          select: { status: true },
        },
      },
    });

    const alreadyReversed = reversalEntries.reduce((sum, entry) => {
      const effectiveStatus = this.getEffectiveLedgerStatus(entry);
      if (
        effectiveStatus !== $Enums.TransactionStatus.COMPLETED &&
        effectiveStatus !== $Enums.TransactionStatus.PENDING
      ) {
        return sum;
      }
      const amount = Number(entry.amount);
      return amount > 0 ? sum + amount : sum;
    }, 0);

    const remaining = requestAmount - alreadyReversed;
    if (remaining <= 0) {
      throw new BadRequestException(adminErrorCodes.ADMIN_PAYMENT_REQUEST_ALREADY_FULLY_REVERSED);
    }

    const finalRequestedAmount = requestedAmount ?? remaining;
    if (finalRequestedAmount > remaining) {
      throw new BadRequestException(adminErrorCodes.ADMIN_REVERSAL_AMOUNT_EXCEEDS_REMAINING_BALANCE);
    }

    const idempotencyKeyBase = this.buildReversalIdempotencyKey({
      paymentRequestId,
      kind: body.kind,
      amount: finalRequestedAmount,
      adminId,
      reason: body.reason ?? null,
    });

    const existingEntry = await this.prisma.ledgerEntryModel.findFirst({
      where: { idempotencyKey: `${idempotencyKeyBase}:payer` },
      select: { ledgerId: true, amount: true },
    });

    if (existingEntry) {
      return {
        ledgerId: existingEntry.ledgerId,
        amount: Number(existingEntry.amount),
        remaining,
        kind: body.kind,
      };
    }

    const remainingAfter = remaining - finalRequestedAmount;

    let stripeRefundId: string | null = null;
    let reversalStatus: $Enums.TransactionStatus = $Enums.TransactionStatus.COMPLETED;

    if (body.kind === `REFUND`) {
      if (!stripePaymentIntentId) {
        throw new BadRequestException(adminErrorCodes.ADMIN_STRIPE_PAYMENT_INTENT_NOT_FOUND_FOR_REFUND);
      }

      const digits = getCurrencyFractionDigits(paymentRequest.currencyCode);
      const amountMinor = Math.round(finalRequestedAmount * 10 ** digits);

      const refund = await this.stripe.refunds.create(
        {
          payment_intent: stripePaymentIntentId,
          amount: amountMinor,
          metadata: {
            paymentRequestId,
            adminId,
            reversalKind: body.kind,
            reason: body.reason ?? ``,
          },
        },
        { idempotencyKey: `refund:${idempotencyKeyBase}` },
      );

      stripeRefundId = refund.id;
      if (refund.status && refund.status !== `succeeded`) {
        reversalStatus = $Enums.TransactionStatus.PENDING;
      }
    }

    const ledgerId = randomUUID();
    const rail = body.kind === `CHARGEBACK` ? $Enums.PaymentRail.STRIPE_CHARGEBACK : $Enums.PaymentRail.STRIPE_REFUND;

    const baseMetadata = {
      rail,
      reversalKind: body.kind,
      source: `admin`,
      stripeObjectType: body.kind === `REFUND` ? `refund` : `manual_chargeback`,
      reason: body.reason ?? null,
      stripePaymentIntentId,
      stripeRefundId,
    } as const;
    const payerMetadata = {
      ...baseMetadata,
      reversalOfLedgerId: originalLedgerId ?? null,
    } as Prisma.InputJsonValue;
    const requesterMetadata = {
      ...baseMetadata,
      reversalOfLedgerId: requesterSettlementEntry?.ledgerId ?? null,
    } as Prisma.InputJsonValue;

    const appendReversalEntries = async () => {
      await this.prisma.$transaction(async (tx) => {
        if (paymentRequest.requesterId) {
          await tx.$executeRaw(
            Prisma.sql`
              SELECT pg_advisory_xact_lock(hashtext((${paymentRequest.requesterId} || ':reversal')::text)::bigint)
            `,
          );

          // REFUND uses Stripe as external source of truth.
          // Once refund succeeds, ledger reversal must be appended idempotently even if
          // requester balance changed due to concurrent activity.
          if (body.kind === `CHARGEBACK`) {
            const requesterBalance = await this.balanceService.calculateInTransaction(
              tx,
              paymentRequest.requesterId,
              paymentRequest.currencyCode,
            );
            if (requesterBalance < finalRequestedAmount) {
              throw new BadRequestException(errorCodes.INSUFFICIENT_REQUESTER_BALANCE_REVERSAL_ADMIN);
            }
          }
        }

        await tx.ledgerEntryModel.create({
          data: {
            ledgerId,
            consumerId: paymentRequest.payerId,
            paymentRequestId,
            type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
            currencyCode: paymentRequest.currencyCode,
            status: reversalStatus,
            amount: finalRequestedAmount,
            createdBy: adminId,
            updatedBy: adminId,
            metadata: payerMetadata,
            idempotencyKey: `${idempotencyKeyBase}:payer`,
            stripeId: stripeRefundId ?? undefined,
          },
        });

        if (paymentRequest.requesterId) {
          await tx.ledgerEntryModel.create({
            data: {
              ledgerId,
              consumerId: paymentRequest.requesterId,
              paymentRequestId,
              type: requesterReversalType,
              currencyCode: paymentRequest.currencyCode,
              status: reversalStatus,
              amount: -finalRequestedAmount,
              createdBy: adminId,
              updatedBy: adminId,
              metadata: requesterMetadata,
              idempotencyKey: `${idempotencyKeyBase}:requester`,
              stripeId: stripeRefundId ?? undefined,
            },
          });
        }
      });
    };

    try {
      await appendReversalEntries();
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === `P2002`) {
        const existingReversal = await this.findExistingReversal(idempotencyKeyBase, remaining, body.kind);
        if (existingReversal) {
          return existingReversal;
        }
      }
      if (body.kind === `REFUND` && stripeRefundId) {
        this.logger.error({
          event: `admin_refund_ledger_append_failed_retrying`,
          paymentRequestId,
          stripeRefundId,
          errorClass: err instanceof Error ? err.name : `UnknownError`,
        });
        try {
          await appendReversalEntries();
        } catch (retryErr) {
          if (retryErr instanceof Prisma.PrismaClientKnownRequestError && retryErr.code === `P2002`) {
            const existingReversal = await this.findExistingReversal(idempotencyKeyBase, remaining, body.kind);
            if (existingReversal) {
              return existingReversal;
            }
          }
          this.logger.error({
            event: `admin_refund_ledger_append_failed_waiting_for_webhook_reconciliation`,
            paymentRequestId,
            stripeRefundId,
            errorClass: retryErr instanceof Error ? retryErr.name : `UnknownError`,
          });
          throw retryErr;
        }
      } else {
        throw err;
      }
    }

    await this.adminActionAudit.record({
      adminId,
      action:
        body.kind === `REFUND`
          ? ADMIN_ACTION_AUDIT_ACTIONS.payment_refund
          : ADMIN_ACTION_AUDIT_ACTIONS.payment_chargeback,
      resource: `payment_request`,
      resourceId: paymentRequestId,
      metadata: {
        amount: finalRequestedAmount,
        currencyCode: paymentRequest.currencyCode,
        ledgerId,
      },
    });

    await this.sendReversalEmails({
      paymentRequestId,
      payerId: paymentRequest.payerId,
      requesterId: paymentRequest.requesterId,
      requesterEmail: paymentRequest.requesterEmail,
      amount: finalRequestedAmount,
      currencyCode: paymentRequest.currencyCode,
      kind: body.kind,
      reason: body.reason ?? null,
    });

    return {
      ledgerId,
      amount: finalRequestedAmount,
      remaining: remainingAfter,
      kind: body.kind,
    };
  }
}
