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

    const where: Prisma.PaymentRequestModelWhereInput = {
      ...(params?.includeDeleted !== true && { deletedAt: null }),
      ...(status && { status }),
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

    const [total, items] = await Promise.all([
      this.prisma.paymentRequestModel.count({ where }),
      this.prisma.paymentRequestModel.findMany({
        where,
        orderBy: { createdAt: `desc` },
        skip,
        take: pageSize,
        include: {
          payer: { select: { id: true, email: true } },
          requester: { select: { id: true, email: true } },
        },
      }),
    ]);

    return { items, total, page, pageSize };
  }

  async getById(id: string) {
    return this.prisma.paymentRequestModel.findUnique({
      where: { id },
      include: {
        payer: { select: { id: true, email: true } },
        requester: { select: { id: true, email: true } },
      },
    });
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
          where: { type: $Enums.LedgerEntryType.USER_PAYMENT },
          select: { ledgerId: true, status: true },
        },
      },
    });

    if (!paymentRequest) throw new NotFoundException(adminErrorCodes.ADMIN_PAYMENT_REQUEST_NOT_FOUND);

    if (!paymentRequest.payerId) {
      throw new BadRequestException(adminErrorCodes.ADMIN_PAYMENT_REQUEST_NOT_FOUND);
    }

    if (paymentRequest.status !== $Enums.TransactionStatus.COMPLETED) {
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
      (entry) => entry.status === $Enums.TransactionStatus.COMPLETED,
    )?.ledgerId;

    const stripePayment = await this.prisma.ledgerEntryModel.findFirst({
      where: {
        paymentRequestId,
        type: $Enums.LedgerEntryType.USER_PAYMENT,
        stripeId: { not: null },
      },
      select: { stripeId: true },
      orderBy: { createdAt: `desc` },
    });

    const stripePaymentIntentId = stripePayment?.stripeId ?? null;

    const reversalEntries = await this.prisma.ledgerEntryModel.findMany({
      where: {
        paymentRequestId,
        type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
        status: { in: [$Enums.TransactionStatus.COMPLETED, $Enums.TransactionStatus.PENDING] },
      },
      select: { amount: true },
    });

    const alreadyReversed = reversalEntries.reduce((sum, entry) => {
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

    const metadata = {
      rail,
      reversalKind: body.kind,
      source: `admin`,
      stripeObjectType: body.kind === `REFUND` ? `refund` : `manual_chargeback`,
      reason: body.reason ?? null,
      reversalOfLedgerId: originalLedgerId ?? null,
      stripePaymentIntentId,
      stripeRefundId,
    } as Prisma.InputJsonValue;

    await this.prisma.$transaction(async (tx) => {
      if (paymentRequest.requesterId) {
        await tx.$executeRaw(
          Prisma.sql`
            SELECT pg_advisory_xact_lock(hashtext((${paymentRequest.requesterId} || ':reversal')::text)::bigint)
          `,
        );

        // Balance check using centralized service (advisory lock above serializes per consumer)
        const requesterBalance = await this.balanceService.calculateInTransaction(
          tx,
          paymentRequest.requesterId,
          paymentRequest.currencyCode,
        );
        if (requesterBalance < finalRequestedAmount) {
          throw new BadRequestException(errorCodes.INSUFFICIENT_REQUESTER_BALANCE_REVERSAL_ADMIN);
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
          metadata,
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
            type: $Enums.LedgerEntryType.USER_PAYMENT_REVERSAL,
            currencyCode: paymentRequest.currencyCode,
            status: reversalStatus,
            amount: -finalRequestedAmount,
            createdBy: adminId,
            updatedBy: adminId,
            metadata,
            idempotencyKey: `${idempotencyKeyBase}:requester`,
            stripeId: stripeRefundId ?? undefined,
          },
        });
      }
    });

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
