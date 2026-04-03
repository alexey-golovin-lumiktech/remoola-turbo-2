import { GET } from './route';
import { getEnv } from '../../../../lib/env.server';

const VERCEL_PROJECT_PRODUCTION_URL_ENV = `VERCEL_PROJECT_PRODUCTION_URL`;

jest.mock(`../../../../lib/env.server`, () => ({
  getEnv: jest.fn(),
}));

describe(`GET /api/settings/theme`, () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalConsumerAppOrigin = process.env.CONSUMER_APP_ORIGIN;
  const originalNextPublicAppOrigin = process.env.NEXT_PUBLIC_APP_ORIGIN;
  const originalVercelProjectProductionUrl = process.env[VERCEL_PROJECT_PRODUCTION_URL_ENV];
  const originalFetch = global.fetch;
  const envRef = process.env as Record<string, string | undefined>;

  beforeEach(() => {
    (getEnv as jest.Mock).mockReturnValue({ NEXT_PUBLIC_API_BASE_URL: `https://api.example.com` });
    global.fetch = jest.fn().mockResolvedValue(new Response(`{"theme":"dark"}`, { status: 200 })) as typeof fetch;
  });

  afterEach(() => {
    envRef.NODE_ENV = originalNodeEnv;
    envRef.CONSUMER_APP_ORIGIN = originalConsumerAppOrigin;
    envRef.NEXT_PUBLIC_APP_ORIGIN = originalNextPublicAppOrigin;
    envRef[VERCEL_PROJECT_PRODUCTION_URL_ENV] = originalVercelProjectProductionUrl;
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  it(`forwards the canonical mobile origin for server-side requests without an incoming origin header`, async () => {
    envRef.NODE_ENV = `production`;
    delete process.env.CONSUMER_APP_ORIGIN;
    delete process.env.NEXT_PUBLIC_APP_ORIGIN;
    envRef[VERCEL_PROJECT_PRODUCTION_URL_ENV] = `remoola-turbo-2-consumer-mobile.vercel.app`;

    const req = new Request(`https://remoola-turbo-2-consumer-mobile.vercel.app/api/settings/theme`, {
      method: `GET`,
      headers: {
        cookie: `consumer_mobile_access_token=token`,
      },
    });

    const res = await GET(req as never);

    expect(res.status).toBe(200);
    const [, init] = (global.fetch as jest.Mock).mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Headers;
    expect(headers.get(`origin`)).toBe(`https://remoola-turbo-2-consumer-mobile.vercel.app`);
  });
});
