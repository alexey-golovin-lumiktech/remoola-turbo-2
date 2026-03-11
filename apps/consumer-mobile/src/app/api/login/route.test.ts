import { POST } from './route';
import { getEnv } from '../../../lib/env.server';
import { TEST_APP_ORIGIN } from '../../../test-constants';

jest.mock(`../../../lib/env.server`, () => ({
  getEnv: jest.fn(),
}));

describe(`POST /api/login`, () => {
  it(`returns 503 when API base URL is not configured`, async () => {
    (getEnv as jest.Mock).mockReturnValue({ NEXT_PUBLIC_API_BASE_URL: undefined });
    const req = new Request(`${TEST_APP_ORIGIN}/api/login`, {
      method: `POST`,
      headers: { 'content-type': `application/json` },
      body: JSON.stringify({ email: `u@e.com`, password: `p` }),
    });
    const res = await POST(req);
    expect(res.status).toBe(503);
    const json = await res.json();
    expect(json.code).toBe(`CONFIG_ERROR`);
  });
});
