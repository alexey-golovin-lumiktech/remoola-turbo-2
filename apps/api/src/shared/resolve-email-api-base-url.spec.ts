import { resolveEmailApiBaseUrl } from './resolve-email-api-base-url';

describe(`resolveEmailApiBaseUrl`, () => {
  it(`returns an HTTP(S) URL ending with /api`, () => {
    const url = resolveEmailApiBaseUrl();
    expect(url).toMatch(/^https?:\/\/.+\/api$/);
  });
});
