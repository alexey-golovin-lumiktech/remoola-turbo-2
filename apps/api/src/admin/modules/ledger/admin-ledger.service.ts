import { Injectable } from '@nestjs/common';

import { $Enums, Prisma } from '@remoola/database-2';

import { PrismaService } from '../../../shared/prisma.service';

const SEARCH_MAX_LEN = 200;
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEDGER_ENTRY_TYPES = Object.values($Enums.LedgerEntryType) as string[];
const TRANSACTION_STATUSES = Object.values($Enums.TransactionStatus) as string[];

@Injectable()
export class AdminLedgersService {
  constructor(private readonly prisma: PrismaService) {}

  /** Bounded list for admin (AGENTS.md 6.10). Search/filter fintech-safe. */
  async findAll(params?: { page?: number; pageSize?: number; q?: string; type?: string; status?: string }) {
    const pageSize = Math.min(Math.max(params?.pageSize ?? 10, 1), 500);
    const page = Math.max(params?.page ?? 1, 1);
    const skip = (page - 1) * pageSize;

    const search =
      typeof params?.q === `string` && params.q.trim().length > 0
        ? params.q.trim().slice(0, SEARCH_MAX_LEN)
        : undefined;
    const type =
      params?.type && LEDGER_ENTRY_TYPES.includes(params.type) ? (params.type as $Enums.LedgerEntryType) : undefined;
    const status =
      params?.status && TRANSACTION_STATUSES.includes(params.status)
        ? (params.status as $Enums.TransactionStatus)
        : undefined;

    const where: Prisma.LedgerEntryModelWhereInput = {
      deletedAt: null,
      ...(type && { type }),
      ...(status && { status }),
      ...(search && {
        OR: [
          { stripeId: { contains: search, mode: `insensitive` } },
          { idempotencyKey: { contains: search, mode: `insensitive` } },
          ...(UUID_REGEX.test(search)
            ? [{ id: { equals: search } }, { ledgerId: { equals: search } }, { paymentRequestId: { equals: search } }]
            : []),
        ],
      }),
    };

    const [total, items] = await Promise.all([
      this.prisma.ledgerEntryModel.count({ where }),
      this.prisma.ledgerEntryModel.findMany({
        where,
        orderBy: { createdAt: `desc` },
        skip,
        take: pageSize,
      }),
    ]);

    return { items, total, page, pageSize };
  }
}
