import { beforeAll, beforeEach, describe, expect, it, jest } from '@jest/globals';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';

import type * as ConsumerApi from '../../../lib/consumer-api.server';

jest.mock(`next/link`, () => ({
  __esModule: true,
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) =>
    React.createElement(`a`, { href, ...props }, children),
}));

jest.mock(`../../../lib/consumer-api.server`, () => ({
  getContracts: jest.fn(),
}));

const { getContracts: mockedGetContracts } = jest.requireMock(`../../../lib/consumer-api.server`) as jest.Mocked<
  typeof ConsumerApi
>;

jest.mock(`./ContractsClient`, () => ({
  ContractsClient: () => React.createElement(`section`, null, `Contracts client loaded`),
}));

async function loadSubject() {
  return (await import(`./page`)).default;
}

let ContractsPage: Awaited<ReturnType<typeof loadSubject>>;

describe(`consumer-css-grid contracts route contextual help`, () => {
  beforeAll(async () => {
    ContractsPage = await loadSubject();
  });

  beforeEach(() => {
    mockedGetContracts.mockReset();
    mockedGetContracts.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      pageSize: 20,
    });
  });

  it(`renders contextual help for the contracts route`, async () => {
    const markup = renderToStaticMarkup(
      await ContractsPage({
        searchParams: Promise.resolve({}),
      }),
    );

    expect(markup).toContain(`Understand the contract workflow before drilling in`);
    expect(markup).toContain(`Contracts client loaded`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.CONTRACTS_RELATIONSHIPS_AND_NEXT_STEPS}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.CONTRACTS_OVERVIEW}`);
    expect(markup).toContain(`/help/${HELP_GUIDE_SLUG.CONTRACTS_COMMON_ISSUES}`);
  });
});
