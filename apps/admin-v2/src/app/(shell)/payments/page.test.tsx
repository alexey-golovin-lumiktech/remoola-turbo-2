import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import type * as AdminApi from '../../../lib/admin-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../lib/admin-api.server`, () => ({
  getPayments: jest.fn(),
  getQuickstart: jest.fn(),
}));

const { getPayments: mockedGetPayments, getQuickstart: mockedGetQuickstart } = jest.requireMock(
  `../../../lib/admin-api.server`,
) as jest.Mocked<typeof AdminApi>;

async function loadSubject() {
  return (await import(`./page`)).default;
}

let PaymentsPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`admin-v2 payments quickstarts`, () => {
  beforeAll(async () => {
    PaymentsPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetPayments.mockReset();
    mockedGetQuickstart.mockReset();
    mockedGetPayments.mockResolvedValue({
      items: [],
      pageInfo: {
        nextCursor: `cursor-2`,
      },
    } as never);
  });

  it(`applies overdue-payment quickstarts to the payments list query and preserves the quickstart in pagination`, async () => {
    mockedGetQuickstart.mockResolvedValue({
      id: `overdue-payments-sweep`,
      label: `Overdue payments sweep`,
      description: `Open overdue payment requests that likely need collections follow-up.`,
      eyebrow: `Priority queue`,
      targetPath: `/payments`,
      surfaces: [`shell`, `overview`],
      filters: { overdue: true },
    } as never);

    const markup = renderToStaticMarkup(
      await PaymentsPage({
        searchParams: Promise.resolve({ quickstart: `overdue-payments-sweep` }),
      }),
    );

    expect(mockedGetPayments).toHaveBeenCalledWith(
      expect.objectContaining({
        overdue: true,
      }),
    );
    expect(markup).toContain(`Overdue payments sweep`);
    expect(markup).toContain(`Remove quickstart`);
    expect(markup).toContain(`/payments?quickstart=overdue-payments-sweep&amp;overdue=true&amp;cursor=cursor-2`);
  });
});
