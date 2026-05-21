import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

const API_BASE_URL = `https://api.example.com`;
const originalApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;

async function loadSubject() {
  return import(`./route`);
}

describe(`consumer-css-grid google start route`, () => {
  const legacyRedirectParam = `return${`Origin`}`;

  beforeEach(() => {
    jest.resetModules();
    process.env.NEXT_PUBLIC_API_BASE_URL = API_BASE_URL;
  });

  afterEach(() => {
    jest.restoreAllMocks();
    if (originalApiBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_API_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_API_BASE_URL = originalApiBaseUrl;
    }
  });

  it(`redirects to backend oauth start while preserving supported params`, async () => {
    const { GET } = await loadSubject();

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
