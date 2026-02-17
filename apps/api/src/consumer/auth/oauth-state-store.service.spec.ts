import { OAuthStateStoreService } from './oauth-state-store.service';

describe(`OAuthStateStoreService`, () => {
  let store: OAuthStateStoreService;

  beforeEach(() => {
    store = new OAuthStateStoreService();
  });

  afterEach(async () => {
    await store.onModuleDestroy();
  });

  it(`consumes state only once`, async () => {
    const token = store.createStateToken();
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
    const token = store.createStateToken();
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

    await new Promise((resolve) => setTimeout(resolve, 5));
    const consumed = await store.consume(token);

    expect(consumed).toBeNull();
  });
});
