import { OAuthStateStoreService } from './oauth-state-store.service';

describe(`OAuthStateStoreService`, () => {
  function makeService() {
    const prisma = {
      oauthStateModel: { create: jest.fn() },
      $queryRaw: jest.fn(),
    } as any;
    const store = new OAuthStateStoreService(prisma);
    return { store, prisma };
  }

  it(`consumes state only once`, async () => {
    const { store, prisma } = makeService();
    const token = store.createStateToken();
    const payload = JSON.stringify([`nonce`, `verifier`, `/dashboard`, Date.now(), null, null]);

    prisma.oauthStateModel.create.mockResolvedValue(undefined);
    prisma.$queryRaw.mockResolvedValueOnce([{ payload }]).mockResolvedValueOnce([]);

    await store.save(
      token,
      {
        nonce: `nonce`,
        codeVerifier: `verifier`,
        nextPath: `/dashboard`,
        createdAt: Date.now(),
      },
      10_000,
    );

    const first = await store.consume(token);
    const second = await store.consume(token);

    expect(first).toBeTruthy();
    expect(first?.codeVerifier).toBe(`verifier`);
    expect(second).toBeNull();
  });

  it(`expires state records`, async () => {
    const { store, prisma } = makeService();
    const token = store.createStateToken();

    prisma.oauthStateModel.create.mockResolvedValue(undefined);
    await store.save(
      token,
      {
        nonce: `nonce`,
        codeVerifier: `verifier`,
        nextPath: `/dashboard`,
        createdAt: Date.now(),
      },
      1,
    );

    prisma.$queryRaw.mockResolvedValue([]);
    const consumed = await store.consume(token);

    expect(consumed).toBeNull();
  });

  it(`reads legacy state payloads`, async () => {
    const { store, prisma } = makeService();
    const token = store.createStateToken();
    const createdAt = Date.now();
    const payload = JSON.stringify([
      `nonce`,
      `verifier`,
      `/dashboard`,
      createdAt,
      `BUSINESS`,
      null,
      `http://localhost:3000`,
    ]);

    prisma.$queryRaw.mockResolvedValueOnce([{ payload }]);

    const consumed = await store.consume(token);

    expect(consumed).toEqual({
      nonce: `nonce`,
      codeVerifier: `verifier`,
      nextPath: `/dashboard`,
      createdAt,
      signupEntryPath: undefined,
      accountType: `BUSINESS`,
      contractorKind: undefined,
      returnOrigin: `http://localhost:3000`,
    });
  });

  it(`round-trips current state payload shape`, async () => {
    const { store, prisma } = makeService();
    const token = store.createStateToken();
    const createdAt = Date.now();
    prisma.oauthStateModel.create.mockResolvedValue(undefined);
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        payload: JSON.stringify([
          `nonce`,
          `verifier`,
          `/signup?accountType=BUSINESS`,
          createdAt,
          `/signup`,
          `BUSINESS`,
          null,
          `http://localhost:3000`,
        ]),
      },
    ]);

    await store.save(
      token,
      {
        nonce: `nonce`,
        codeVerifier: `verifier`,
        nextPath: `/signup?accountType=BUSINESS`,
        createdAt,
        signupEntryPath: `/signup`,
        accountType: `BUSINESS`,
        returnOrigin: `http://localhost:3000`,
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
      returnOrigin: `http://localhost:3000`,
    });
  });

  it(`consumes login handoffs only once`, async () => {
    const { store, prisma } = makeService();
    const token = store.createEphemeralToken();
    prisma.oauthStateModel.create.mockResolvedValue(undefined);
    prisma.$queryRaw.mockResolvedValueOnce([
      { payload: JSON.stringify({ type: `oauth_login_handoff`, identityId: `consumer-id`, nextPath: `/dashboard` }) },
    ]);

    await store.saveLoginHandoff(token, { identityId: `consumer-id`, nextPath: `/dashboard` }, 10_000);

    const first = await store.consumeLoginHandoff(token);
    prisma.$queryRaw.mockResolvedValueOnce([]);
    const second = await store.consumeLoginHandoff(token);

    expect(first).toEqual({ identityId: `consumer-id`, nextPath: `/dashboard` });
    expect(second).toBeNull();
  });
});
