import { GET } from './route';
import { getEnv } from '../../../lib/env.server';

jest.mock(`../../../lib/env.server`, () => ({
  getEnv: jest.fn(),
}));

describe(`GET /api/me`, () => {
  it(`returns 503 when API base URL is not configured`, async () => {
    (getEnv as jest.Mock).mockReturnValue({ NEXT_PUBLIC_API_BASE_URL: undefined });
    const req = new Request(`http://localhost:3002/api/me`, { method: `GET` });
    const res = await GET(req as never);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.code).toBe(`CONFIG_ERROR`);
  });
});
