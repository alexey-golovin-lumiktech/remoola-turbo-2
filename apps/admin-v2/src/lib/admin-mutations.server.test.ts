import {
  changeAdminPermissionsAction,
  changeAdminRoleAction,
  revokeAdminSessionAction,
  revokeMyAdminSessionAction,
} from './admin-mutations/admins.server';
import { removeConsumerFlagAction } from './admin-mutations/consumers.server';
import { chargebackPaymentAction, refundPaymentAction } from './admin-mutations/payments.server';

jest.mock(`next/cache`, () => ({
  revalidatePath: jest.fn(),
}));

jest.mock(`next/headers`, () => ({
  cookies: jest.fn(async () => ({
    toString: () => `admin_csrf_token=csrf-token`,
  })),
}));

jest.mock(`./admin-auth-headers.server`, () => ({
  buildAdminMutationHeaders: jest.fn((_cookieHeader: string, extraHeaders: Record<string, string> = {}) => ({
    ...extraHeaders,
    Cookie: `admin_csrf_token=csrf-token`,
    'x-csrf-token': `csrf-token`,
  })),
}));

jest.mock(`./env.server`, () => ({
  getEnv: jest.fn(() => ({
    NEXT_PUBLIC_API_BASE_URL: `https://api.example.com`,
  })),
}));

const originalFetch = global.fetch;

function mockSuccessfulFetch(): void {
  global.fetch = jest.fn(async () => new Response(null, { status: 200 })) as typeof fetch;
}

function getLastFetchCall(): [string, RequestInit] {
  const calls = (global.fetch as jest.MockedFunction<typeof fetch>).mock.calls;
  const [url, init] = calls[calls.length - 1] ?? [];
  if (typeof url !== `string` || !init) {
    throw new Error(`Expected fetch to be called with a string URL and init`);
  }
  return [url, init];
}

function getJsonBody(init: RequestInit): unknown {
  if (typeof init.body !== `string`) {
    throw new Error(`Expected JSON string body`);
  }
  return JSON.parse(init.body) as unknown;
}

describe(`admin mutation actions`, () => {
  beforeEach(() => {
    mockSuccessfulFetch();
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  it(`uses PATCH for consumer flag removal`, async () => {
    const formData = new FormData();
    formData.set(`version`, `7`);

    await removeConsumerFlagAction(`consumer-1`, `flag-1`, formData);

    expect(global.fetch).toHaveBeenCalledWith(
      `https://api.example.com/admin-v2/consumers/consumer-1/flags/flag-1/remove`,
      expect.objectContaining({
        method: `PATCH`,
        body: JSON.stringify({ version: 7 }),
      }),
    );
  });

  it(`posts refund requests with step-up confirmation and idempotency headers`, async () => {
    const formData = new FormData();
    formData.set(`confirmed`, `on`);
    formData.set(`amount`, `25.5`);
    formData.set(`reason`, `Customer refund`);
    formData.set(`passwordConfirmation`, `step-up-password`);

    await refundPaymentAction(`payment-1`, `payer-1`, `requester-1`, formData);

    const [url, init] = getLastFetchCall();
    expect(url).toBe(`https://api.example.com/admin-v2/payments/payment-1/refund`);
    expect(init.method).toBe(`POST`);
    expect(init.cache).toBe(`no-store`);
    expect(init.headers).toEqual(
      expect.objectContaining({
        'content-type': `application/json`,
        'x-correlation-id': expect.any(String),
        'Idempotency-Key': expect.any(String),
      }),
    );
    expect(getJsonBody(init)).toEqual({
      amount: 25.5,
      reason: `Customer refund`,
      passwordConfirmation: `step-up-password`,
    });
  });

  it(`does not send refunds without explicit confirmation`, async () => {
    const formData = new FormData();

    await expect(refundPaymentAction(`payment-1`, `payer-1`, `requester-1`, formData)).rejects.toThrow(
      `Confirmation is required to issue a refund`,
    );

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it(`posts chargeback requests with optional amount omitted when blank`, async () => {
    const formData = new FormData();
    formData.set(`confirmedSubmit`, `true`);
    formData.set(`amount`, ``);
    formData.set(`reason`, `Cardholder dispute`);
    formData.set(`passwordConfirmation`, `step-up-password`);

    await chargebackPaymentAction(`payment-1`, null, `requester-1`, formData);

    const [url, init] = getLastFetchCall();
    expect(url).toBe(`https://api.example.com/admin-v2/payments/payment-1/chargeback`);
    expect(init.method).toBe(`POST`);
    expect(getJsonBody(init)).toEqual({
      reason: `Cardholder dispute`,
      passwordConfirmation: `step-up-password`,
    });
  });

  it(`posts admin role changes with confirmed step-up body`, async () => {
    const formData = new FormData();
    formData.set(`version`, `3`);
    formData.set(`confirmed`, `yes`);
    formData.set(`roleKey`, `FINANCE_ADMIN`);
    formData.set(`passwordConfirmation`, `step-up-password`);

    await changeAdminRoleAction(`admin-1`, formData);

    const [url, init] = getLastFetchCall();
    expect(url).toBe(`https://api.example.com/admin-v2/admins/admin-1/role-change`);
    expect(init.method).toBe(`POST`);
    expect(getJsonBody(init)).toEqual({
      version: 3,
      confirmed: true,
      roleKey: `FINANCE_ADMIN`,
      passwordConfirmation: `step-up-password`,
    });
  });

  it(`posts admin permission overrides for every known capability`, async () => {
    const formData = new FormData();
    formData.set(`version`, `4`);
    formData.set(`passwordConfirmation`, `step-up-password`);
    formData.set(`capability_override_admins.manage`, `deny`);
    formData.set(`capability_override_payments.reverse`, `grant`);

    await changeAdminPermissionsAction(`admin-1`, formData);

    const [url, init] = getLastFetchCall();
    expect(url).toBe(`https://api.example.com/admin-v2/admins/admin-1/permissions-change`);
    expect(init.method).toBe(`POST`);
    expect(getJsonBody(init)).toEqual(
      expect.objectContaining({
        version: 4,
        passwordConfirmation: `step-up-password`,
        capabilityOverrides: expect.arrayContaining([
          { capability: `admins.manage`, mode: `deny` },
          { capability: `payments.reverse`, mode: `grant` },
          { capability: `overview.read`, mode: `inherit` },
        ]),
      }),
    );
  });

  it(`posts own-session revocation and requires a session id`, async () => {
    const missingFormData = new FormData();
    await expect(revokeMyAdminSessionAction(missingFormData)).rejects.toThrow(`sessionId is required`);
    expect(global.fetch).not.toHaveBeenCalled();

    const formData = new FormData();
    formData.set(`sessionId`, `session-1`);

    await revokeMyAdminSessionAction(formData);

    const [url, init] = getLastFetchCall();
    expect(url).toBe(`https://api.example.com/admin-v2/auth/revoke-session`);
    expect(init.method).toBe(`POST`);
    expect(getJsonBody(init)).toEqual({ sessionId: `session-1` });
  });

  it(`posts targeted admin-session revocation`, async () => {
    const formData = new FormData();

    await revokeAdminSessionAction(`admin-1`, `session-1`, formData);

    const [url, init] = getLastFetchCall();
    expect(url).toBe(`https://api.example.com/admin-v2/admins/admin-1/sessions/session-1/revoke`);
    expect(init.method).toBe(`POST`);
    expect(getJsonBody(init)).toEqual({});
  });
});
