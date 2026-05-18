import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class AdminExchangeActionLockRepository {
  constructor(private readonly prisma: PrismaService) {}

  async tryActionLock(tx: Prisma.TransactionClient, lockKey: string) {
    const rows = await tx.$queryRaw<Array<{ locked: boolean }>>(Prisma.sql`
      SELECT pg_try_advisory_xact_lock(hashtext(${lockKey}::text)::bigint) AS locked
    `);
    return Boolean(rows[0]?.locked);
  }
}
