import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../../lib/admin-api.server';

const mockedNotFound = jest.fn(() => {
  throw new Error(`NEXT_NOT_FOUND`);
});

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`next/navigation`, () => ({
  notFound: mockedNotFound,
}));

jest.mock(`../../../../lib/admin-api.server`, () => ({
  getAdminIdentity: jest.fn(),
  getPaymentMethodCase: jest.fn(),
}));

jest.mock(`../../../../lib/admin-mutations.server`, () => ({
  disablePaymentMethodAction: jest.fn(),
  removeDefaultPaymentMethodAction: jest.fn(),
  escalateDuplicatePaymentMethodAction: jest.fn(),
}));

const { getAdminIdentity: mockedGetAdminIdentity, getPaymentMethodCase: mockedGetPaymentMethodCase } = jest.requireMock(
  `../../../../lib/admin-api.server`,
) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let PaymentMethodCasePage: Awaited<ReturnType<typeof loadSubject>>;

function buildPaymentMethodCase() {
  return {
    id: `pm-1`,
    type: `CREDIT_CARD`,
    status: `ACTIVE`,
    stripePaymentMethodId: `stripe-pm-1`,
    stripeFingerprint: `fp-shared`,
    defaultSelected: true,
    version: 1713258000000,
    brand: `Visa`,
    last4: `4242`,
    expMonth: `04`,
    expYear: `2030`,
    bankName: null,
    bankLast4: null,
    bankCountry: null,
    bankCurrency: null,
    serviceFee: 0,
    createdAt: `2026-04-16T08:00:00.000Z`,
    updatedAt: `2026-04-16T09:00:00.000Z`,
    disabledAt: null,
    disabledBy: null,
    deletedAt: null,
    consumer: {
      id: `consumer-1`,
      email: `owner@example.com`,
    },
    billingDetails: {
      id: `billing-1`,
      email: `billing@example.com`,
      name: `Owner`,
      phone: `+10000000000`,
      deletedAt: null,
    },
    duplicateEscalation: null,
    fingerprintDuplicates: [
      {
        id: `pm-2`,
        type: `CREDIT_CARD`,
        brand: `Visa`,
        last4: `1111`,
        bankLast4: null,
        defaultSelected: false,
        createdAt: `2026-04-15T08:00:00.000Z`,
        deletedAt: null,
        consumer: {
          id: `consumer-2`,
          email: `other@example.com`,
        },
      },
    ],
  };
}

describe(`admin-v2 payment method detail kickoff surface`, () => {
  beforeAll(async () => {
    PaymentMethodCasePage = await loadSubject();
  });

  beforeEach(() => {
    mockedNotFound.mockClear();
    mockedGetAdminIdentity.mockReset();
    mockedGetPaymentMethodCase.mockReset();
    mockedGetAdminIdentity.mockResolvedValue({
      id: `admin-1`,
      email: `super@example.com`,
      type: `SUPER`,
      role: `SUPER_ADMIN`,
      phase: `MVP-2 slice: payouts.read`,
      capabilities: [`payment_methods.read`, `payment_methods.manage`],
      workspaces: [`payment_methods`],
    });
    mockedGetPaymentMethodCase.mockResolvedValue(buildPaymentMethodCase());
  });

  it(`renders only the schema-backed read surface and anti-invention copy`, async () => {
    const markup = renderToStaticMarkup(
      await PaymentMethodCasePage({
        params: Promise.resolve({ paymentMethodId: `pm-1` }),
      }),
    );

    expect(mockedGetPaymentMethodCase).toHaveBeenCalledWith(`pm-1`);
    expect(markup).toContain(`No usage semantics are inferred here.`);
    expect(markup).toContain(`/consumers/consumer-1`);
    expect(markup).toContain(`/payment-methods?consumerId=consumer-1&amp;includeDeleted=true`);
    expect(markup).toContain(`/payment-methods?fingerprint=fp-shared&amp;includeDeleted=true`);
    expect(markup).toContain(`/payment-methods/pm-2`);
    expect(markup).toContain(`Billing details`);
    expect(markup).toContain(`Disable payment method`);
    expect(markup).toContain(`Remove default marker`);
    expect(markup).toContain(`Escalate duplicate fingerprint`);
    expect(markup).toContain(`No usage semantics are inferred here.`);
  });

  it(`delegates missing records to notFound instead of inventing fallback semantics`, async () => {
    mockedGetPaymentMethodCase.mockResolvedValueOnce(null);

    await expect(
      PaymentMethodCasePage({
        params: Promise.resolve({ paymentMethodId: `pm-missing` }),
      }),
    ).rejects.toThrow(`NEXT_NOT_FOUND`);

    expect(mockedNotFound).toHaveBeenCalledTimes(1);
  });

  it(`shows durable escalation state instead of rendering a duplicate action twice`, async () => {
    mockedGetPaymentMethodCase.mockResolvedValueOnce({
      ...buildPaymentMethodCase(),
      duplicateEscalation: {
        id: `esc-1`,
        fingerprint: `fp-shared`,
        duplicateCount: 2,
        duplicatePaymentMethodIds: [`pm-2`],
        createdAt: `2026-04-16T10:00:00.000Z`,
        escalatedBy: {
          id: `admin-1`,
          email: `super@example.com`,
        },
      },
    });

    const markup = renderToStaticMarkup(
      await PaymentMethodCasePage({
        params: Promise.resolve({ paymentMethodId: `pm-1` }),
      }),
    );

    expect(markup).toContain(`Duplicate escalation record`);
    expect(markup).not.toContain(`Escalate duplicate fingerprint`);
  });
});
