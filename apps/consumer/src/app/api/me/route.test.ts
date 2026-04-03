import { GET } from './route';

const VERCEL_PROJECT_PRODUCTION_URL_ENV = `VERCEL_PROJECT_PRODUCTION_URL`;

describe(`GET /api/me`, () => {
  const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalConsumerAppOrigin = process.env.CONSUMER_APP_ORIGIN;
  const originalNextPublicAppOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;
  const originalVercelProjectProductionUrl = process.env[VERCEL_PROJECT_PRODUCTION_URL_ENV];
  const originalFetch = global.fetch;
  const envRef = process.env as Record<string, string | undefined>;

  beforeEach(() => {
    envRef.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
    global.fetch = jest.fn().mockResolvedValue(new Response(`{"id":"consumer-1"}`, { status: 200 })) as typeof fetch;
  });

  afterEach(() => {
    envRef.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    envRef.NODE_ENV = originalNodeEnv;
    envRef.CONSUMER_APP_ORIGIN = originalConsumerAppOrigin;
    envRef.NEXT_PUBLIC_APP_ORIGIN = originalNextPublicAppOrigin;
    envRef[VERCEL_PROJECT_PRODUCTION_URL_ENV] = originalVercelProjectProductionUrl;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it(`forwards the canonical origin for server-side requests without an incoming origin header`, async () => {
    envRef.NODE_ENV = `production`;
    delete process.env.CONSUMER_APP_ORIGIN;
    delete process.env.NEXT_PUBLIC_APP_ORIGIN;
    envRef[VERCEL_PROJECT_PRODUCTION_URL_ENV] = `remoola-turbo-2-consumer.vercel.app`;

    const req = new Request(`https://remoola-turbo-2-consumer.vercel.app/api/me`, {
      method: `GET`,
      headers: {
        cookie: `consumer_access_token=token`,
      },
    });

    const res = await GET(req as never);

    expect(res.status).toBe(200);
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get(`origin`)).toBe(`https://remoola-turbo-2-consumer.vercel.app`);
  });
});
