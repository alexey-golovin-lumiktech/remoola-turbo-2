import { resolveRequestBaseUrl } from './request-base-url';

describe(`resolveRequestBaseUrl`, () => {
  it(`prefers forwarded proto and host headers`, () => {
    const req = {
      headers: {
        'x-forwarded-proto': `https`,
        'x-forwarded-host': `api.example.com`,
      },
      protocol: `http`,
      secure: false,
      get: jest.fn(),
    } as any;

    expect(resolveRequestBaseUrl(req)).toBe(`https://api.example.com`);
  });

  it(`falls back to request protocol and host`, () => {
    const req = {
      headers: {
        host: `localhost:3334`,
      },
      protocol: `http`,
      secure: false,
      get: jest.fn().mockReturnValue(`localhost:3334`),
    } as any;

    expect(resolveRequestBaseUrl(req)).toBe(`http://localhost:3334`);
  });
});
