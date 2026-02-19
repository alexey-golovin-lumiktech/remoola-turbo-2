import crypto from 'crypto';

import { Injectable, OnModuleDestroy } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';

import { envs } from '../../envs';
import { PrismaService } from '../../shared/prisma.service';

export type OAuthStateRecord = {
  nonce: string;
  codeVerifier: string;
  nextPath: string;
  createdAt: number;
  accountType?: string;
  contractorKind?: string;
};

@Injectable()
export class OAuthStateStoreService implements OnModuleDestroy {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleDestroy() {
    // Prisma disconnect is handled by PrismaService
  }

  createStateToken() {
    const random = crypto.randomBytes(32).toString(`base64url`);
    const signature = crypto.createHmac(`sha256`, envs.SECURE_SESSION_SECRET).update(random).digest(`base64url`);
    return `${random}.${signature}`;
  }

  private stateKey(stateToken: string) {
    return crypto.createHash(`sha256`).update(stateToken).digest(`base64url`);
  }

  async save(stateToken: string, record: OAuthStateRecord, ttlMs: number) {
    const key = this.stateKey(stateToken);
    const expiresAt = new Date(Date.now() + ttlMs);
    const payload = this.serialize(record);

    await this.prisma.oauthStateModel.create({
      data: { stateKey: key, payload, expiresAt },
    });
  }

  async consume(stateToken: string): Promise<OAuthStateRecord | null> {
    const key = this.stateKey(stateToken);

    const rows = await this.prisma.$queryRaw<{ payload: string }[]>(
      Prisma.sql`DELETE FROM oauth_state WHERE state_key = ${key} AND expires_at > NOW() RETURNING payload`,
    );
    const raw = rows[0]?.payload;
    if (!raw) return null;
    return this.deserialize(raw);
  }

  private deserialize(raw: string) {
    try {
      const parsed = JSON.parse(raw) as [string, string, string, number, string | null, string | null];
      if (!Array.isArray(parsed) || parsed.length < 4) return null;
      const [nonce, codeVerifier, nextPath, createdAt, accountType, contractorKind] = parsed;
      if (
        typeof nonce !== `string` ||
        typeof codeVerifier !== `string` ||
        typeof nextPath !== `string` ||
        typeof createdAt !== `number`
      ) {
        return null;
      }

      return {
        nonce,
        codeVerifier,
        nextPath,
        createdAt,
        accountType: accountType ?? undefined,
        contractorKind: contractorKind ?? undefined,
      };
    } catch {
      return null;
    }
  }

  private serialize(record: OAuthStateRecord) {
    return JSON.stringify([
      record.nonce,
      record.codeVerifier,
      record.nextPath,
      record.createdAt,
      record.accountType ?? null,
      record.contractorKind ?? null,
    ]);
  }
}
