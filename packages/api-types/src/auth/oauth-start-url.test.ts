import { buildConsumerGoogleOAuthStartUrl } from './oauth-start-url';

describe(`oauth-start-url`, () => {
  it(`builds the same-origin BFF route and encodes a raw deep link exactly once`, () => {
    const built = buildConsumerGoogleOAuthStartUrl(`/settings`);
    const url = new URL(built, `https://app.example.com`);

    expect(built).toBe(`/api/consumer/auth/google/start?next=%2Fsettings`);
    expect(url.pathname).toBe(`/api/consumer/auth/google/start`);
    expect(url.search).toBe(`?next=%2Fsettings`);
    expect(url.searchParams.get(`next`)).toBe(`/settings`);
  });

  it(`preserves query params and hash in the next path`, () => {
    const built = buildConsumerGoogleOAuthStartUrl(`/payments?id=pay_123#details`);
    const url = new URL(built, `https://app.example.com`);

    expect(url.searchParams.get(`next`)).toBe(`/payments?id=pay_123#details`);
    expect(url.toString()).toContain(`next=%2Fpayments%3Fid%3Dpay_123%23details`);
  });
});
