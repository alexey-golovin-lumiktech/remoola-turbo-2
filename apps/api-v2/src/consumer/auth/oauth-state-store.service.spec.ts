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
});
