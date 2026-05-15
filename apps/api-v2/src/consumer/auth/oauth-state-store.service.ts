import { Injectable } from '@nestjs/common';

import { parseConsumerAppScope, type ConsumerAppScope } from '@remoola/api-types';
import { oauthCrypto } from '@remoola/security-utils';

import { OAuthStateStoreQuery } from './oauth-state-store.query';
import { OAuthStateStoreRepository } from './oauth-state-store.repository';
import { envs } from '../../envs';

type OAuthStateRecord = {
  nonce: string;
  codeVerifier: string;
  nextPath: string;
  createdAt: number;
  appScope: ConsumerAppScope;
  signupEntryPath?: string;
  accountType?: string;
  contractorKind?: string;
};

type OAuthLoginHandoffRecord = {
  identityId: string;
  nextPath: string;
  appScope: ConsumerAppScope;
};

type OAuthSignupContextRecord = {
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
  appScope: ConsumerAppScope;
};

type StoredLoginHandoffRecord = OAuthLoginHandoffRecord & { type: `oauth_login_handoff` };
type StoredSignupHandoffRecord = OAuthSignupContextRecord & { type: `oauth_signup_handoff` };
type StoredSignupSessionRecord = OAuthSignupContextRecord & { type: `oauth_signup_session` };
type StoredTypedRecord = StoredLoginHandoffRecord | StoredSignupHandoffRecord | StoredSignupSessionRecord;

@Injectable()
export class OAuthStateStoreService {
  constructor(
    private readonly query: OAuthStateStoreQuery,
    private readonly repository: OAuthStateStoreRepository,
  ) {}

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
    await this.savePayload(stateToken, this.serialize(record), ttlMs);
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
    const raw = await this.consumePayload(stateToken);
    if (!raw) return null;
    return this.deserialize(raw);
  }

  async read(stateToken: string): Promise<OAuthStateRecord | null> {
    const raw = await this.readPayload(stateToken);
    if (!raw) return null;
    return this.deserialize(raw);
  }

  private async saveTypedRecord(stateToken: string, record: StoredTypedRecord, ttlMs: number) {
    await this.savePayload(stateToken, JSON.stringify(record), ttlMs);
  }

  private toStoredLoginHandoffRecord(record: OAuthLoginHandoffRecord): StoredLoginHandoffRecord {
    return {
      type: `oauth_login_handoff`,
      identityId: record.identityId,
      nextPath: record.nextPath,
      appScope: record.appScope,
    };
  }

  private toLoginHandoffRecord(record: StoredLoginHandoffRecord): OAuthLoginHandoffRecord {
    return {
      identityId: record.identityId,
      nextPath: record.nextPath,
      appScope: record.appScope,
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
      appScope: record.appScope,
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
      appScope: record.appScope,
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
      appScope: record.appScope,
    };
  }

  private async consumeTypedRecord<TType extends StoredTypedRecord[`type`]>(
    stateToken: string,
    type: TType,
  ): Promise<Extract<StoredTypedRecord, { type: TType }> | null> {
    const payload = await this.consumePayload(stateToken);
    return this.deserializeTyped(payload ?? undefined, type);
  }

  private async readTypedRecord<TType extends StoredTypedRecord[`type`]>(
    stateToken: string,
    type: TType,
  ): Promise<Extract<StoredTypedRecord, { type: TType }> | null> {
    const payload = await this.readPayload(stateToken);
    if (!payload) return null;
    return this.deserializeTyped(payload, type);
  }

  private async savePayload(stateToken: string, payload: string, ttlMs: number) {
    const key = this.stateKey(stateToken);
    const expiresAt = new Date(Date.now() + ttlMs);

    await this.repository.createStateRecord(key, payload, expiresAt);
  }

  private consumePayload(stateToken: string) {
    return this.repository.consumeStatePayload(this.stateKey(stateToken));
  }

  private async readPayload(stateToken: string): Promise<string | null> {
    const row = await this.query.readStatePayload(this.stateKey(stateToken));
    if (!row || row.expiresAt <= new Date()) return null;
    return row.payload;
  }

  private deserialize(raw: string) {
    try {
      const parsed = JSON.parse(raw) as Partial<OAuthStateRecord>;
      const { nonce, codeVerifier, nextPath, createdAt, signupEntryPath, accountType, contractorKind, appScope } =
        parsed;

      const normalizedAppScope = typeof appScope === `string` ? parseConsumerAppScope(appScope) : undefined;
      if (
        typeof nonce !== `string` ||
        typeof codeVerifier !== `string` ||
        typeof nextPath !== `string` ||
        typeof createdAt !== `number` ||
        !normalizedAppScope
      ) {
        return null;
      }

      return {
        nonce,
        codeVerifier,
        nextPath,
        createdAt,
        signupEntryPath: typeof signupEntryPath === `string` ? signupEntryPath : undefined,
        accountType: typeof accountType === `string` ? accountType : undefined,
        contractorKind: typeof contractorKind === `string` ? contractorKind : undefined,
        appScope: normalizedAppScope,
      };
    } catch {
      return null;
    }
  }

  private serialize(record: OAuthStateRecord) {
    return JSON.stringify(record);
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
