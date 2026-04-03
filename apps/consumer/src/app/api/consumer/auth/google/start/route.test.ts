import { afterEach, beforeEach, describe, expect, it } from '@jest/globals';

import { GET } from './route';

describe(`consumer google start route`, () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_API_BASE_URL = `https://api.example.com`;
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_API_BASE_URL;
  });

  it(`redirects through the backend oauth start while preserving supported params`, async () => {
    const request = {
      nextUrl: new URL(
        `https://app.example.com/api/consumer/auth/google/start?next=%2Fsignup&signupPath=%2Fsignup&accountType=BUSINESS`,
      ),
    } as never;

    const response = await GET(request);
    const location = response.headers.get(`location`);

    expect(response.status).toBe(307);
    expect(location).toContain(`https://api.example.com/consumer/auth/google/start`);
    expect(location).toContain(`next=%2Fsignup`);
    expect(location).toContain(`signupPath=%2Fsignup`);
    expect(location).toContain(`accountType=BUSINESS`);
  });
});
