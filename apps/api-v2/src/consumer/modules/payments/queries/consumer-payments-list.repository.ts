import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { ConsumerEmailResolver } from './consumer-email.resolver';
import { buildConsumerStatusFilter } from '../../../../shared/consumer-status-compat';
import { buildPaymentRequestParticipantIdsSql, sqlUuid } from '../../../../shared/prisma-raw.utils';
import { PrismaService } from '../../../../shared/prisma.service';
import {
  buildConsumerPaymentListInclude,
  mapToConsumerPaymentListItem,
} from '../mappers/consumer-payment-list-item.mapper';

@Injectable()
export class ConsumerPaymentsListRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly emailResolver: ConsumerEmailResolver,
  ) {}

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

  private buildPaymentRoleIdsSql(consumerId: string, consumerEmail: string | null, role?: string): Prisma.Sql {
    const normalizedRole = role === `PAYER` || role === `REQUESTER` ? role : undefined;
    return buildPaymentRequestParticipantIdsSql({
      consumerId,
      consumerEmail: consumerEmail?.trim().toLowerCase() ?? null,
      role: normalizedRole,
    });
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
    const consumerEmail = await this.emailResolver.resolve(consumerId);
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
    const include = buildConsumerPaymentListInclude(consumerId);
    const orderBy = {
      createdAt: `desc` as const,
    };
    type PaymentRequestWithInclude = Prisma.PaymentRequestModelGetPayload<{ include: typeof include }>;
    let total = 0;
    let paymentRequests: PaymentRequestWithInclude[] = [];

    if (effectiveStatusFilter) {
      const participantPaymentIdsSql = this.buildPaymentRoleIdsSql(consumerId, normalizedConsumerEmail, role);
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
        WITH participant_payment_ids AS (
          ${participantPaymentIdsSql}
        )
        SELECT pr.id, pr.created_at
        FROM participant_payment_ids ppi
        JOIN payment_request pr ON pr.id = ppi.id
        LEFT JOIN consumer requester ON requester.id = pr.requester_id
        LEFT JOIN consumer payer ON payer.id = pr.payer_id
        LEFT JOIN LATERAL (
          SELECT le.id, le.status
          FROM ledger_entry le
          WHERE le.payment_request_id = pr.id
            AND le.consumer_id = ${sqlUuid(consumerId)}
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
        WHERE 1 = 1
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
      paymentRequests.sort((left, right) => (positionById.get(left.id) ?? 0) - (positionById.get(right.id) ?? 0));
    } else {
      paymentRequests = await this.prisma.paymentRequestModel.findMany({
        where: whereBase,
        include,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
      });
      total = await this.prisma.paymentRequestModel.count({ where: whereBase });
    }

    const items = paymentRequests.map((paymentRequest) =>
      mapToConsumerPaymentListItem(paymentRequest, consumerId, normalizedConsumerEmail),
    );

    return { items, total, page, pageSize };
  }
}
