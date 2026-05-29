import { describe, expect, it } from '@jest/globals';

import {
  buildContractsListContextHref,
  buildContractsListMetrics,
  describeContractsSearchState,
  isContractsListSearchMode,
} from './contracts-list-state';
import { buildContractsHref } from './contracts-search-params';

describe(`contracts-list-state`, () => {
  it(`derives the current list context href from pathname and query`, () => {
    expect(buildContractsListContextHref(`/contracts`, `page=2&status=waiting`)).toBe(
      `/contracts?page=2&status=waiting`,
    );
    expect(buildContractsListContextHref(`/contracts`, ``)).toBe(`/contracts`);
  });

  it(`serializes filter changes through the canonical contracts href helper`, () => {
    expect(
      buildContractsHref(`/contracts`, `page=3&pageSize=10&status=waiting`, {
        query: `Vendor Two`,
        status: `draft`,
        hasDocuments: `yes`,
        hasPayments: null,
        sort: `name`,
        page: `1`,
        pageSize: `10`,
      }),
    ).toBe(`/contracts?page=1&pageSize=10&status=draft&query=Vendor+Two&hasDocuments=yes&sort=name`);
  });

  it(`builds page-level derived counts from the visible contracts`, () => {
    expect(
      buildContractsListMetrics([
        {
          id: `contract-1`,
          name: `One`,
          email: `one@example.com`,
          lastRequestId: `payment-1`,
          lastStatus: `completed`,
          lastActivity: null,
          docs: 2,
          paymentsCount: 1,
          completedPaymentsCount: 1,
        },
        {
          id: `contract-2`,
          name: `Two`,
          email: `two@example.com`,
          lastRequestId: null,
          lastStatus: `pending`,
          lastActivity: null,
          docs: 0,
          paymentsCount: 0,
          completedPaymentsCount: 0,
        },
      ]),
    ).toEqual({
      completedCount: 1,
      withLatestPaymentCount: 1,
      withDocumentsCount: 1,
    });
  });

  it(`describes the applied filter state and detects search mode`, () => {
    expect(describeContractsSearchState(`draft`, `yes`, `no`, `name`)).toContain(
      `Only draft relationships remain visible.`,
    );
    expect(isContractsListSearchMode(``, `all`, `all`, `all`, `recent_activity`)).toBe(false);
    expect(isContractsListSearchMode(`vendor`, `all`, `all`, `all`, `recent_activity`)).toBe(true);
  });
});
