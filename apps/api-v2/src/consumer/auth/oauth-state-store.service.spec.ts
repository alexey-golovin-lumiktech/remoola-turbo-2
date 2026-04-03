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
    const payload = JSON.stringify({
      nonce: `nonce`,
      codeVerifier: `verifier`,
      nextPath: `/dashboard`,
      createdAt: Date.now(),
      appScope: `consumer`,
    });

    prisma.oauthStateModel.create.mockResolvedValue(undefined);
    prisma.$queryRaw.mockResolvedValueOnce([{ payload }]).mockResolvedValueOnce([]);

    await store.save(
      token,
      {
        nonce: `nonce`,
        codeVerifier: `verifier`,
        nextPath: `/dashboard`,
        createdAt: Date.now(),
        appScope: `consumer`,
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
        appScope: `consumer`,
      },
      1,
    );

    prisma.$queryRaw.mockResolvedValue([]);
    const consumed = await store.consume(token);

    expect(consumed).toBeNull();
  });

  it(`round-trips current state payload shape`, async () => {
    const { store, prisma } = makeService();
    const token = store.createStateToken();
    const createdAt = Date.now();
    prisma.oauthStateModel.create.mockResolvedValue(undefined);
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        payload: JSON.stringify({
          nonce: `nonce`,
          codeVerifier: `verifier`,
          nextPath: `/signup?accountType=BUSINESS`,
          createdAt,
          signupEntryPath: `/signup`,
          accountType: `BUSINESS`,
          appScope: `consumer-mobile`,
        }),
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
        appScope: `consumer-mobile`,
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
      appScope: `consumer-mobile`,
    });
  });

  it(`consumes login handoffs only once`, async () => {
    const { store, prisma } = makeService();
    const token = store.createEphemeralToken();
    prisma.oauthStateModel.create.mockResolvedValue(undefined);
    prisma.$queryRaw.mockResolvedValueOnce([
      {
        payload: JSON.stringify({
          type: `oauth_login_handoff`,
          identityId: `consumer-id`,
          nextPath: `/dashboard`,
          appScope: `consumer-css-grid`,
        }),
      },
    ]);

    await store.saveLoginHandoff(
      token,
      { identityId: `consumer-id`, nextPath: `/dashboard`, appScope: `consumer-css-grid` },
      10_000,
    );

    const first = await store.consumeLoginHandoff(token);
    prisma.$queryRaw.mockResolvedValueOnce([]);
    const second = await store.consumeLoginHandoff(token);

    expect(first).toEqual({ identityId: `consumer-id`, nextPath: `/dashboard`, appScope: `consumer-css-grid` });
    expect(second).toBeNull();
  });

  it(`reads signup session records with app scope`, async () => {
    const { store, prisma } = makeService();
    const token = store.createEphemeralToken();
    prisma.oauthStateModel.findUnique = jest.fn().mockResolvedValue({
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
        appScope: `consumer`,
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
      appScope: `consumer`,
    });
  });
});
