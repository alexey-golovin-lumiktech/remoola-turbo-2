import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';

import { type getLedgerDisputes, type getLedgerEntries } from '../../../lib/admin-api/ledger.server';
jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../lib/admin-api/ledger.server`, () => ({
  getLedgerDisputes: jest.fn(),
  getLedgerEntries: jest.fn(),
}));

const { getLedgerDisputes: mockedGetLedgerDisputes, getLedgerEntries: mockedGetLedgerEntries } = jest.requireMock(
  `../../../lib/admin-api/ledger.server`,
) as {
  getLedgerDisputes: jest.MockedFunction<typeof getLedgerDisputes>;
  getLedgerEntries: jest.MockedFunction<typeof getLedgerEntries>;
};

async function loadSubject() {
  return (await import(`./page`)).default;
}

let LedgerPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 ledger filters`, () => {
  beforeAll(async () => {
    LedgerPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetLedgerEntries.mockReset();
    mockedGetLedgerDisputes.mockReset();
    mockedGetLedgerEntries.mockResolvedValue({ items: [], pageInfo: { nextCursor: null } } as never);
    mockedGetLedgerDisputes.mockResolvedValue({ items: [], pageInfo: { nextCursor: null } } as never);
  });

  it(`preserves ledger payment and consumer filters while omitting invalid dates`, async () => {
    await LedgerPage({
      searchParams: Promise.resolve({
        paymentRequestId: ` payment-1 `,
        consumerId: [`consumer-1`, `consumer-2`],
        dateFrom: `not-a-date`,
        dateTo: `2026-04-30`,
      }),
    });

    expect(mockedGetLedgerEntries).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentRequestId: `payment-1`,
        consumerId: `consumer-1`,
        dateFrom: undefined,
        dateTo: `2026-04-30`,
      }),
    );
  });
});
