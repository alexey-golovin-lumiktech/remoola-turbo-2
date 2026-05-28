import { describe, expect, it, jest } from '@jest/globals';

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import { type OAuthStateStoreQuery } from './oauth-state-store.query';
import { type OAuthStateStoreRepository } from './oauth-state-store.repository';
import { OAuthStateStoreService } from './oauth-state-store.service';

describe(`OAuthStateStoreService`, () => {
  function makeService() {
    const repository = {
      createStateRecord: jest.fn<(...a: any[]) => any>(async () => undefined),
      consumeStatePayload: jest.fn<(...a: any[]) => any>(async () => null),
    };
    const query = {
      readStatePayload: jest.fn<(...a: any[]) => any>(async () => null),
    };
    const store = new OAuthStateStoreService(
      query as unknown as OAuthStateStoreQuery,
      repository as unknown as OAuthStateStoreRepository,
    );
    return { store, repository, query };
  }

  it(`consumes state only once`, async () => {
    const { store, repository } = makeService();
    const token = store.createStateToken();
    const payload = JSON.stringify({
      nonce: `nonce`,
      codeVerifier: `verifier`,
      nextPath: `/dashboard`,
      createdAt: Date.now(),
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });

    repository.consumeStatePayload.mockResolvedValueOnce(payload).mockResolvedValueOnce(null);

    await store.save(
      token,
      {
        nonce: `nonce`,
        codeVerifier: `verifier`,
        nextPath: `/dashboard`,
        createdAt: Date.now(),
        appScope: CURRENT_CONSUMER_APP_SCOPE,
      },
      10_000,
    );

    const first = await store.consume(token);
    const second = await store.consume(token);

    expect(first).toBeTruthy();
    expect(first?.codeVerifier).toBe(`verifier`);
    expect(second).toBeNull();
    expect(repository.createStateRecord).toHaveBeenCalledWith(expect.any(String), expect.any(String), expect.any(Date));
    expect(repository.consumeStatePayload).toHaveBeenCalledTimes(2);
  });

  it(`expires state records`, async () => {
    const { store, repository } = makeService();
    const token = store.createStateToken();

    await store.save(
      token,
      {
        nonce: `nonce`,
        codeVerifier: `verifier`,
        nextPath: `/dashboard`,
        createdAt: Date.now(),
        appScope: CURRENT_CONSUMER_APP_SCOPE,
      },
      1,
    );

    repository.consumeStatePayload.mockResolvedValueOnce(null);
    const consumed = await store.consume(token);

    expect(consumed).toBeNull();
  });

  it(`round-trips current state payload shape`, async () => {
    const { store, repository } = makeService();
    const token = store.createStateToken();
    const createdAt = Date.now();
    repository.consumeStatePayload.mockResolvedValueOnce(
      JSON.stringify({
        nonce: `nonce`,
        codeVerifier: `verifier`,
        nextPath: `/signup?accountType=BUSINESS`,
        createdAt,
        signupEntryPath: `/signup`,
        accountType: `BUSINESS`,
        appScope: CURRENT_CONSUMER_APP_SCOPE,
      }),
    );

    await store.save(
      token,
      {
        nonce: `nonce`,
        codeVerifier: `verifier`,
        nextPath: `/signup?accountType=BUSINESS`,
        createdAt,
        signupEntryPath: `/signup`,
        accountType: `BUSINESS`,
        appScope: CURRENT_CONSUMER_APP_SCOPE,
      },
      10_000,
    );

    const consumed = await store.consume(token);

    expect(consumed).toEqual({
      nonce: `nonce`,
      codeVerifier: `verifier`,
      nextPath: `/signup?accountType=BUSINESS`,
      createdAt,
      signupEntryPath: `/signup`,
      accountType: `BUSINESS`,
      contractorKind: undefined,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });
  });

  it(`reads state records without consuming them`, async () => {
    const { store, repository, query } = makeService();
    const token = store.createStateToken();
    const createdAt = Date.now();
    query.readStatePayload.mockResolvedValue({
      payload: JSON.stringify({
        nonce: `nonce`,
        codeVerifier: `verifier`,
        nextPath: `/dashboard`,
        createdAt,
        appScope: CURRENT_CONSUMER_APP_SCOPE,
      }),
      expiresAt: new Date(Date.now() + 10_000),
    });

    const record = await store.read(token);

    expect(record).toEqual({
      nonce: `nonce`,
      codeVerifier: `verifier`,
      nextPath: `/dashboard`,
      createdAt,
      signupEntryPath: undefined,
      accountType: undefined,
      contractorKind: undefined,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });
    expect(query.readStatePayload).toHaveBeenCalledWith(expect.any(String));
    expect(repository.consumeStatePayload).not.toHaveBeenCalled();
  });

  it(`rejects persisted legacy consumer app scopes`, async () => {
    const { store, query } = makeService();
    const token = store.createStateToken();
    query.readStatePayload.mockResolvedValue({
      payload: JSON.stringify({
        nonce: `nonce`,
        codeVerifier: `verifier`,
        nextPath: `/dashboard`,
        createdAt: Date.now(),
        appScope: `consumer`,
      }),
      expiresAt: new Date(Date.now() + 10_000),
    });

    await expect(store.read(token)).resolves.toBeNull();
  });

  it(`consumes login handoffs only once`, async () => {
    const { store, repository } = makeService();
    const token = store.createEphemeralToken();
    repository.consumeStatePayload.mockResolvedValueOnce(
      JSON.stringify({
        type: `oauth_login_handoff`,
        identityId: `consumer-id`,
        nextPath: `/dashboard`,
        appScope: CURRENT_CONSUMER_APP_SCOPE,
      }),
    );

    await store.saveLoginHandoff(
      token,
      { identityId: `consumer-id`, nextPath: `/dashboard`, appScope: CURRENT_CONSUMER_APP_SCOPE },
      10_000,
    );

    const first = await store.consumeLoginHandoff(token);
    repository.consumeStatePayload.mockResolvedValueOnce(null);
    const second = await store.consumeLoginHandoff(token);

    expect(first).toEqual({ identityId: `consumer-id`, nextPath: `/dashboard`, appScope: CURRENT_CONSUMER_APP_SCOPE });
    expect(second).toBeNull();
  });

  it(`reads signup session records with app scope`, async () => {
    const { store, query } = makeService();
    const token = store.createEphemeralToken();
    query.readStatePayload.mockResolvedValue({
      payload: JSON.stringify({
        type: `oauth_signup_session`,
        email: `user@example.com`,
        emailVerified: true,
        name: `User`,
        givenName: `User`,
        familyName: null,
        picture: null,
        organization: null,
        sub: `sub`,
        signupEntryPath: `/signup`,
        nextPath: `/dashboard`,
        accountType: `BUSINESS`,
        contractorKind: null,
        appScope: CURRENT_CONSUMER_APP_SCOPE,
      }),
      expiresAt: new Date(Date.now() + 10_000),
    });

    const record = await store.readSignupSession(token);

    expect(record).toEqual({
      email: `user@example.com`,
      emailVerified: true,
      name: `User`,
      givenName: `User`,
      familyName: null,
      picture: null,
      organization: null,
      sub: `sub`,
      signupEntryPath: `/signup`,
      nextPath: `/dashboard`,
      accountType: `BUSINESS`,
      contractorKind: null,
      appScope: CURRENT_CONSUMER_APP_SCOPE,
    });
  });

  it(`returns null for invalid typed payloads after query delegation`, async () => {
    const { store, query } = makeService();
    const token = store.createEphemeralToken();
    query.readStatePayload.mockResolvedValue({
      payload: JSON.stringify({
        type: `oauth_login_handoff`,
        identityId: `consumer-id`,
        nextPath: `/dashboard`,
        appScope: CURRENT_CONSUMER_APP_SCOPE,
      }),
      expiresAt: new Date(Date.now() + 10_000),
    });

    await expect(store.readSignupSession(token)).resolves.toBeNull();
  });
});
