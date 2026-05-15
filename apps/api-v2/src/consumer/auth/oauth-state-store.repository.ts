import { Injectable } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { PrismaService } from '../../shared/prisma.service';

@Injectable()
export class OAuthStateStoreRepository {
  constructor(private readonly prisma: PrismaService) {}

  createStateRecord(stateKey: string, payload: string, expiresAt: Date) {
    return this.prisma.oauthStateModel.create({
      data: { stateKey, payload, expiresAt },
    });
  }

  async deleteExpiredStates(now: Date = new Date()): Promise<number> {
    const result = await this.prisma.oauthStateModel.deleteMany({
      where: { expiresAt: { lt: now } },
    });

    return result.count;
  }

  async consumeStatePayload(stateKey: string): Promise<string | null> {
    const rows = await this.prisma.$queryRaw<{ payload: string }[]>(
      Prisma.sql`DELETE FROM oauth_state WHERE state_key = ${stateKey} AND expires_at > NOW() RETURNING payload`,
    );

    return rows[0]?.payload ?? null;
  }
}
