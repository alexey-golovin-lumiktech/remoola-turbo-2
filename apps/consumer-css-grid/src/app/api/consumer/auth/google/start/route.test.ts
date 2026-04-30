import { afterEach, describe, expect, it, jest } from '@jest/globals';

const mockGetEnv = jest.fn();

jest.mock(`../../../../../../lib/env.server`, () => ({
  getEnv: (...args: unknown[]) => mockGetEnv(...args),
}));

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import { GET } from './route';

describe(`consumer-css-grid google start route`, () => {
  const legacyRedirectParam = `return${`Origin`}`;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it(`redirects to backend oauth start while preserving supported params`, async () => {
    mockGetEnv.mockReturnValue({ NEXT_PUBLIC_API_BASE_URL: `https://api.example.com` });

    const request = {
      nextUrl: new URL(
        `https://grid.example.com/api/consumer/auth/google/start?next=%2Fsignup&accountType=BUSINESS&${legacyRedirectParam}=https%3A%2F%2Fevil.example.com`,
      ),
    } as never;

    const response = await GET(request);
    const location = response.headers.get(`location`);

    expect(response.status).toBe(307);
    expect(location).toContain(`/consumer/auth/google/start`);
    expect(location).toContain(`appScope=${CURRENT_CONSUMER_APP_SCOPE}`);
    expect(location).toContain(`next=%2Fsignup`);
    expect(location).toContain(`accountType=BUSINESS`);
    expect(location).not.toContain(`${legacyRedirectParam}=`);
  });
});
