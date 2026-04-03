import { Injectable, OnModuleDestroy } from '@nestjs/common';

import { Prisma } from '@remoola/database-2';
import { oauthCrypto } from '@remoola/security-utils';

import { envs } from '../../envs';
import { PrismaService } from '../../shared/prisma.service';

export type OAuthStateRecord = {
  nonce: string;
  codeVerifier: string;
  nextPath: string;
  createdAt: number;
  signupEntryPath?: string;
  accountType?: string;
  contractorKind?: string;
  redirectOrigin?: string;
};

export type OAuthLoginHandoffRecord = {
  identityId: string;
  nextPath: string;
  redirectOrigin?: string;
};

export type OAuthSignupContextRecord = {
  email: string;
  emailVerified: boolean;
  name: string | null;
  givenName: string | null;
  familyName: string | null;
  picture: string | null;
  organization: string | null;
  sub: string | null;
  signupEntryPath: string | null;
  nextPath: string | null;
  accountType: string | null;
  contractorKind: string | null;
  redirectOrigin: string | null;
};

type StoredLoginHandoffRecord = OAuthLoginHandoffRecord & { type: `oauth_login_handoff` };
type StoredSignupHandoffRecord = OAuthSignupContextRecord & { type: `oauth_signup_handoff` };
type StoredSignupSessionRecord = OAuthSignupContextRecord & { type: `oauth_signup_session` };
type StoredTypedRecord = StoredLoginHandoffRecord | StoredSignupHandoffRecord | StoredSignupSessionRecord;

@Injectable()
export class OAuthStateStoreService implements OnModuleDestroy {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleDestroy() {
    // Prisma disconnect is handled by PrismaService
  }

  createStateToken() {
    const random = oauthCrypto.generateOAuthState();
    const signature = oauthCrypto.signOAuthState(random, envs.SECURE_SESSION_SECRET);
    return `${random}.${signature}`;
  }

  createEphemeralToken() {
    return this.createStateToken();
  }

  private stateKey(stateToken: string) {
    return oauthCrypto.hashOAuthState(stateToken);
  }

  async save(stateToken: string, record: OAuthStateRecord, ttlMs: number) {
    const key = this.stateKey(stateToken);
    const expiresAt = new Date(Date.now() + ttlMs);
    const payload = this.serialize(record);

    await this.prisma.oauthStateModel.create({
      data: { stateKey: key, payload, expiresAt },
    });
  }

  async saveLoginHandoff(stateToken: string, record: OAuthLoginHandoffRecord, ttlMs: number) {
    await this.saveTypedRecord(stateToken, this.toStoredLoginHandoffRecord(record), ttlMs);
  }

  async consumeLoginHandoff(stateToken: string): Promise<OAuthLoginHandoffRecord | null> {
    const record = await this.consumeTypedRecord(stateToken, `oauth_login_handoff`);
    if (!record) return null;
    return this.toLoginHandoffRecord(record);
  }

  async saveSignupHandoff(stateToken: string, record: OAuthSignupContextRecord, ttlMs: number) {
    await this.saveTypedRecord(stateToken, this.toStoredSignupHandoffRecord(record), ttlMs);
  }

  async consumeSignupHandoff(stateToken: string): Promise<OAuthSignupContextRecord | null> {
    const record = await this.consumeTypedRecord(stateToken, `oauth_signup_handoff`);
    if (!record) return null;
    return this.toSignupContextRecord(record);
  }

  async saveSignupSession(stateToken: string, record: OAuthSignupContextRecord, ttlMs: number) {
    await this.saveTypedRecord(stateToken, this.toStoredSignupSessionRecord(record), ttlMs);
  }

  async readSignupSession(stateToken: string): Promise<OAuthSignupContextRecord | null> {
    const record = await this.readTypedRecord(stateToken, `oauth_signup_session`);
    if (!record) return null;
    return this.toSignupContextRecord(record);
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

  private async saveTypedRecord(stateToken: string, record: StoredTypedRecord, ttlMs: number) {
    const key = this.stateKey(stateToken);
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.prisma.oauthStateModel.create({
      data: { stateKey: key, payload: JSON.stringify(record), expiresAt },
    });
  }

  private toStoredLoginHandoffRecord(record: OAuthLoginHandoffRecord): StoredLoginHandoffRecord {
    return {
      type: `oauth_login_handoff`,
      identityId: record.identityId,
      nextPath: record.nextPath,
      redirectOrigin: record.redirectOrigin,
    };
  }

  private toLoginHandoffRecord(record: StoredLoginHandoffRecord): OAuthLoginHandoffRecord {
    return {
      identityId: record.identityId,
      nextPath: record.nextPath,
      redirectOrigin: record.redirectOrigin,
    };
  }

  private toStoredSignupHandoffRecord(record: OAuthSignupContextRecord): StoredSignupHandoffRecord {
    return {
      type: `oauth_signup_handoff`,
      email: record.email,
      emailVerified: record.emailVerified,
      name: record.name,
      givenName: record.givenName,
      familyName: record.familyName,
      picture: record.picture,
      organization: record.organization,
      sub: record.sub,
      signupEntryPath: record.signupEntryPath,
      nextPath: record.nextPath,
      accountType: record.accountType,
      contractorKind: record.contractorKind,
      redirectOrigin: record.redirectOrigin,
    };
  }

  private toStoredSignupSessionRecord(record: OAuthSignupContextRecord): StoredSignupSessionRecord {
    return {
      type: `oauth_signup_session`,
      email: record.email,
      emailVerified: record.emailVerified,
      name: record.name,
      givenName: record.givenName,
      familyName: record.familyName,
      picture: record.picture,
      organization: record.organization,
      sub: record.sub,
      signupEntryPath: record.signupEntryPath,
      nextPath: record.nextPath,
      accountType: record.accountType,
      contractorKind: record.contractorKind,
      redirectOrigin: record.redirectOrigin,
    };
  }

  private toSignupContextRecord(
    record: StoredSignupHandoffRecord | StoredSignupSessionRecord,
  ): OAuthSignupContextRecord {
    return {
      email: record.email,
      emailVerified: record.emailVerified,
      name: record.name,
      givenName: record.givenName,
      familyName: record.familyName,
      picture: record.picture,
      organization: record.organization,
      sub: record.sub,
      signupEntryPath: record.signupEntryPath,
      nextPath: record.nextPath,
      accountType: record.accountType,
      contractorKind: record.contractorKind,
      redirectOrigin: record.redirectOrigin,
    };
  }

  private async consumeTypedRecord<TType extends StoredTypedRecord[`type`]>(
    stateToken: string,
    type: TType,
  ): Promise<Extract<StoredTypedRecord, { type: TType }> | null> {
    const key = this.stateKey(stateToken);
    const rows = await this.prisma.$queryRaw<{ payload: string }[]>(
      Prisma.sql`DELETE FROM oauth_state WHERE state_key = ${key} AND expires_at > NOW() RETURNING payload`,
    );
    return this.deserializeTyped(rows[0]?.payload, type);
  }

  private async readTypedRecord<TType extends StoredTypedRecord[`type`]>(
    stateToken: string,
    type: TType,
  ): Promise<Extract<StoredTypedRecord, { type: TType }> | null> {
    const row = await this.prisma.oauthStateModel.findUnique({
      where: { stateKey: this.stateKey(stateToken) },
      select: { payload: true, expiresAt: true },
    });
    if (!row || row.expiresAt <= new Date()) return null;
    return this.deserializeTyped(row.payload, type);
  }

  private deserialize(raw: string) {
    try {
      const parsed = JSON.parse(raw) as Array<string | number | null>;
      if (!Array.isArray(parsed) || parsed.length < 4) return null;
      const nonce = parsed[0];
      const codeVerifier = parsed[1];
      const nextPath = parsed[2];
      const createdAt = parsed[3];
      if (
        typeof nonce !== `string` ||
        typeof codeVerifier !== `string` ||
        typeof nextPath !== `string` ||
        typeof createdAt !== `number`
      ) {
        return null;
      }

      const usesExtendedShape = parsed.length >= 8;
      const signupEntryPath = usesExtendedShape ? parsed[4] : null;
      const accountType = parsed[usesExtendedShape ? 5 : 4];
      const contractorKind = parsed[usesExtendedShape ? 6 : 5];
      const redirectOrigin = parsed[usesExtendedShape ? 7 : 6];
      const asOptionalString = (value: string | number | null | undefined) =>
        typeof value === `string` ? value : undefined;

      return {
        nonce,
        codeVerifier,
        nextPath,
        createdAt,
        signupEntryPath: asOptionalString(signupEntryPath),
        accountType: asOptionalString(accountType),
        contractorKind: asOptionalString(contractorKind),
        redirectOrigin: asOptionalString(redirectOrigin),
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
      record.signupEntryPath ?? null,
      record.accountType ?? null,
      record.contractorKind ?? null,
      record.redirectOrigin ?? null,
    ]);
  }

  private deserializeTyped<TType extends StoredTypedRecord[`type`]>(
    raw: string | undefined,
    type: TType,
  ): Extract<StoredTypedRecord, { type: TType }> | null {
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as StoredTypedRecord;
      if (!parsed || typeof parsed !== `object` || Array.isArray(parsed) || parsed.type !== type) {
        return null;
      }
      return parsed as Extract<StoredTypedRecord, { type: TType }>;
    } catch {
      return null;
    }
  }
}
