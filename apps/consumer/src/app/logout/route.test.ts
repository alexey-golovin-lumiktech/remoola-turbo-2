import { GET } from './route';

describe(`GET /logout`, () => {
  const originalApiBase = process.env.NEXT_PUBLIC_API_BASE_URL;

  beforeEach(() => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBase;
  });

  it(`preserves valid auth_notice when redirecting to login`, async () => {
    const req = new Request(`http://localhost:3001/logout?auth_notice=password_changed`, { method: `GET` });
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get(`location`)).toBe(`http://localhost:3001/login?auth_notice=password_changed`);
  });

  it(`preserves password_set auth_notice when redirecting to login`, async () => {
    const req = new Request(`http://localhost:3001/logout?auth_notice=password_set`, { method: `GET` });
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get(`location`)).toBe(`http://localhost:3001/login?auth_notice=password_set`);
  });

  it(`drops invalid auth_notice values`, async () => {
    const req = new Request(`http://localhost:3001/logout?auth_notice=unknown_value`, { method: `GET` });
    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get(`location`)).toBe(`http://localhost:3001/login`);
  });
});
