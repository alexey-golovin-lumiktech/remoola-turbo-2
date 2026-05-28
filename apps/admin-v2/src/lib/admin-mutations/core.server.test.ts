import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

type MockFetch = jest.MockedFunction<typeof fetch>;

jest.mock(`next/headers`, () => ({
  cookies: jest.fn(),
}));

jest.mock(`../admin-auth-headers.server`, () => ({
  buildAdminMutationHeaders: jest.fn(() => ({
    'content-type': `application/json`,
    cookie: `admin_refresh=refresh-token`,
    origin: `https://admin-v2.example.com`,
  })),
}));

jest.mock(`crypto`, () => ({
  randomUUID: jest.fn(() => `uuid-1`),
}));

let mockedCookies: jest.Mock;

async function loadSubject() {
  return import(`./core.server`);
}

describe(`admin-v2 mutation runtime`, () => {
  const originalEnv = process.env;
  const originalFetch = global.fetch;
  const originalAbortSignalTimeout = AbortSignal.timeout;
  let mockFetch: MockFetch;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_API_BASE_URL: `https://api.example.com`,
    };
    mockFetch = jest.fn() as MockFetch;
    global.fetch = mockFetch;
    AbortSignal.timeout = jest.fn(() => new AbortController().signal);
    ({ cookies: mockedCookies } = jest.requireMock(`next/headers`) as {
      cookies: jest.Mock;
    });
    mockedCookies.mockResolvedValue({
      toString: () => `admin_refresh=refresh-token; admin_csrf=csrf-token`,
    } as never);
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
    AbortSignal.timeout = originalAbortSignalTimeout;
  });

  it(`throws a config error when the API base URL is missing`, async () => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
    const { postAdminMutation } = await loadSubject();

    await expect(
      postAdminMutation(`/admin-v2/consumers/consumer-1/notes`, { content: `hello` }, `Failed`),
    ).rejects.toThrow(`API base URL is not configured`);
  });

  it(`maps network failures to a shared upstream error`, async () => {
    const { postAdminMutation } = await loadSubject();
    mockFetch.mockRejectedValueOnce(new Error(`ECONNRESET`));

    await expect(
      postAdminMutation(`/admin-v2/consumers/consumer-1/notes`, { content: `hello` }, `Failed`),
    ).rejects.toThrow(`The upstream API request failed. Please try again.`);
  });

  it(`surfaces upstream JSON errors and preserves timeout discipline`, async () => {
    const { patchAdminMutation } = await loadSubject();
    mockFetch.mockResolvedValueOnce(
      new Response(JSON.stringify({ code: `VALIDATION_ERROR`, message: `Invalid payload` }), {
        status: 422,
        headers: { 'content-type': `application/json` },
      }),
    );

    await expect(
      patchAdminMutation(`/admin-v2/consumers/consumer-1/flags/flag-1/remove`, { version: 2 }, `Fallback message`),
    ).rejects.toThrow(`Invalid payload`);

    expect(mockFetch).toHaveBeenCalledWith(
      `https://api.example.com/admin-v2/consumers/consumer-1/flags/flag-1/remove`,
      {
        method: `PATCH`,
        headers: expect.objectContaining({
          'content-type': `application/json`,
          cookie: `admin_refresh=refresh-token`,
          origin: `https://admin-v2.example.com`,
        }),
        body: JSON.stringify({ version: 2 }),
        cache: `no-store`,
        signal: expect.any(AbortSignal),
      },
    );
  });

  it(`falls back to the supplied message when the upstream error body is not JSON`, async () => {
    const { deleteAdminMutation } = await loadSubject();
    mockFetch.mockResolvedValueOnce(new Response(`not-json`, { status: 500 }));

    await expect(
      deleteAdminMutation(`/admin-v2/documents/tags/tag-1`, { version: 1 }, `Fallback message`),
    ).rejects.toThrow(`Fallback message`);
  });

  it(`completes successfully for ok responses`, async () => {
    const { postAdminMutation } = await loadSubject();
    mockFetch.mockResolvedValueOnce(new Response(null, { status: 204 }));

    await expect(
      postAdminMutation(`/admin-v2/consumers/consumer-1/notes`, { content: `hello` }, `Failed to create note`),
    ).resolves.toBeUndefined();
  });
});
