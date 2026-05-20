import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import { type getPaymentMethods } from '../../../lib/admin-api/payments.server';
jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../lib/admin-api/payments.server`, () => ({
  getPaymentMethods: jest.fn(),
}));

const { getPaymentMethods: mockedGetPaymentMethods } = jest.requireMock(`../../../lib/admin-api/payments.server`) as {
  getPaymentMethods: jest.MockedFunction<typeof getPaymentMethods>;
};

async function loadSubject() {
  return (await import(`./page`)).default;
}

let PaymentMethodsPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 payment methods filters`, () => {
  beforeAll(async () => {
    PaymentMethodsPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetPaymentMethods.mockReset();
    mockedGetPaymentMethods.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 } as never);
  });

  it(`normalizes boolean and page filters before loading payment methods`, async () => {
    await PaymentMethodsPage({
      searchParams: Promise.resolve({
        page: `not-a-page`,
        defaultSelected: `false`,
        includeDeleted: `yes`,
      }),
    });

    expect(mockedGetPaymentMethods).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 1,
        defaultSelected: false,
        includeDeleted: undefined,
      }),
    );
  });
});
