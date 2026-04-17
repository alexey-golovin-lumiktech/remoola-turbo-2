import { beforeAll, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToReadableStream } from 'react-dom/server';

jest.mock(`../../../features/auth/LoginForm`, () => ({
  LoginForm: () => React.createElement(`section`, null, `Login form loaded`),
}));

async function loadSubject() {
  return (await import(`./page`)).default;
}

let LoginPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 login canonical MVP-2 framing`, () => {
  beforeAll(async () => {
    LoginPage = await loadSubject();
  });

  it(`states that the login shell keeps canonical tiers without flattening finance breadth or activating System`, async () => {
    const stream = await renderToReadableStream(<LoginPage searchParams={Promise.resolve({})} />);
    const markup = await new Response(stream).text();

    expect(markup).toContain(
      `Canonical MVP-2 shell keeps Overview, Consumers, Verification, Payments, Ledger and Audit primary.`,
    );
    expect(markup).toContain(
      `Exchange and Documents remain top-level breadth, Admins stays later breadth for eligible super-admin identities, and`,
    );
    expect(markup).toContain(
      `Payouts plus Payment Methods stay nested finance investigation routes. System remains outside MVP-2.`,
    );
    expect(markup).not.toContain(`Active MVP-2 breadth`);
    expect(markup).toContain(`Login form loaded`);
  });
});
