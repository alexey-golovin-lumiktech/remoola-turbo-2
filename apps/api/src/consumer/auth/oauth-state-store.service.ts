import crypto from 'crypto';

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

import { envs } from '../../envs';

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
  private readonly logger = new Logger(OAuthStateStoreService.name);
  private readonly redisPrefix = `oauth:google:state:`;
  private readonly memory = new Map<string, { record: OAuthStateRecord; expiresAt: number }>();
  private redis?: Redis;
  private readonly redisEnabled: boolean;

  constructor() {
    const hasExplicitRedisUrl = typeof envs.REDIS_URL === `string` && envs.REDIS_URL.trim().length > 0;
    const hasCustomRedisHost =
      envs.REDIS_HOST !== `127.0.0.1` || envs.REDIS_PORT !== 6379 || typeof envs.REDIS_PASSWORD === `string`;
    this.redisEnabled = hasExplicitRedisUrl || hasCustomRedisHost;
    if (!this.redisEnabled) return;

    const redisUrl = envs.REDIS_URL?.trim();
    if (redisUrl) {
      this.redis = new Redis(redisUrl, {
        lazyConnect: true,
        enableReadyCheck: true,
        maxRetriesPerRequest: 1,
      });
      return;
    }

    if (envs.REDIS_HOST) {
      this.redis = new Redis({
        host: envs.REDIS_HOST,
        port: envs.REDIS_PORT,
        password: envs.REDIS_PASSWORD || undefined,
        lazyConnect: true,
        enableReadyCheck: true,
        maxRetriesPerRequest: 1,
      });
    }
  }

  async onModuleDestroy() {
    if (this.redis) {
      try {
        await this.redis.quit();
      } catch {
        // ignore shutdown errors
      }
    }
  }

  createStateToken() {
    const random = crypto.randomBytes(32).toString(`base64url`);
    const signature = crypto.createHmac(`sha256`, envs.SECURE_SESSION_SECRET).update(random).digest(`base64url`);
    return `${random}.${signature}`;
  }

  async save(stateToken: string, record: OAuthStateRecord, ttlMs: number) {
    const ttlSeconds = Math.max(1, Math.floor(ttlMs / 1000));
    const key = this.redisKey(stateToken);
    const payload = this.serialize(record);
    const redis = await this.getRedis();

    if (redis) {
      await redis.set(key, payload, `EX`, ttlSeconds);
      return;
    }

    const expiresAt = Date.now() + ttlMs;
    this.memory.set(key, { record, expiresAt });
  }

  async consume(stateToken: string): Promise<OAuthStateRecord | null> {
    const key = this.redisKey(stateToken);
    const redis = await this.getRedis();

    if (redis) {
      let raw: string | null = null;
      try {
        raw = (await redis.call(`GETDEL`, key)) as string | null;
      } catch {
        raw = await redis.get(key);
        if (raw) await redis.del(key);
      }
      if (!raw) return null;
      return this.deserialize(raw);
    }

    const existing = this.memory.get(key);
    if (!existing) return null;
    this.memory.delete(key);
    if (Date.now() > existing.expiresAt) return null;
    return existing.record;
  }

  private redisKey(stateToken: string) {
    // Keep redis keys compact to reduce memory overhead on low-tier plans.
    const hashed = crypto.createHash(`sha256`).update(stateToken).digest(`base64url`);
    return `${this.redisPrefix}${hashed}`;
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

  private async getRedis() {
    if (!this.redisEnabled) return null;
    if (!this.redis) return null;
    try {
      if (this.redis.status !== `ready`) {
        await this.redis.connect();
      }
      return this.redis;
    } catch {
      this.logger.warn(`Redis unavailable for OAuth state store; using in-memory fallback`);
      return null;
    }
  }
}
