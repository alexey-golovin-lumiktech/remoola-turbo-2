import { removeConsumerFlagAction } from './admin-mutations.server';

jest.mock(`next/cache`, () => ({
  revalidatePath: jest.fn(),
}));

jest.mock(`next/headers`, () => ({
  cookies: jest.fn(async () => ({
    toString: () => `admin_csrf_token=csrf-token`,
  })),
}));

jest.mock(`./admin-auth-headers.server`, () => ({
  buildAdminMutationHeaders: jest.fn(() => ({
    Cookie: `admin_csrf_token=csrf-token`,
    'x-csrf-token': `csrf-token`,
    'content-type': `application/json`,
  })),
}));

jest.mock(`./env.server`, () => ({
  getEnv: jest.fn(() => ({
    NEXT_PUBLIC_API_BASE_URL: `https://api.example.com`,
  })),
}));

describe(`removeConsumerFlagAction`, () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = jest.fn(async () => new Response(null, { status: 200 })) as typeof fetch;
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it(`uses PATCH for consumer flag removal`, async () => {
    const formData = new FormData();
    formData.set(`version`, `7`);

    await removeConsumerFlagAction(`consumer-1`, `flag-1`, formData);

    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.example.com/admin-v2/consumers/consumer-1/flags/flag-1/remove`,
      expect.objectContaining({
        method: `PATCH`,
        body: JSON.stringify({ version: 7 }),
      }),
    );
  });
});
