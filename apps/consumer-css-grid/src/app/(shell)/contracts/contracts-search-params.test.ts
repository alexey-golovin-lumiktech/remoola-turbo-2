import { describe, expect, it } from '@jest/globals';

import { buildContractsHref, parseContractsSearchParams } from './contracts-search-params';

describe(`contracts search params helpers`, () => {
  it(`parses page, page size, and trimmed query with defaults`, () => {
    expect(parseContractsSearchParams()).toEqual({
      page: 1,
      pageSize: 10,
      query: ``,
      status: `all`,
      hasDocuments: `all`,
      hasPayments: `all`,
      sort: `recent_activity`,
    });

    expect(
      parseContractsSearchParams({
        page: `3`,
        pageSize: `25`,
        query: `  vendor@example.com  `,
        status: `draft`,
        hasDocuments: `yes`,
        hasPayments: `no`,
        sort: `payments_count`,
      }),
    ).toEqual({
      page: 3,
      pageSize: 25,
      query: `vendor@example.com`,
      status: `draft`,
      hasDocuments: `yes`,
      hasPayments: `no`,
      sort: `payments_count`,
    });
  });

  it(`clamps invalid pagination values`, () => {
    expect(
      parseContractsSearchParams({
        page: `0`,
        pageSize: `-5`,
      }),
    ).toEqual({
      page: 1,
      pageSize: 1,
      query: ``,
      status: `all`,
      hasDocuments: `all`,
      hasPayments: `all`,
      sort: `recent_activity`,
    });
  });

  it(`falls back to all when status is unsupported`, () => {
    expect(
      parseContractsSearchParams({
        status: `archived`,
        hasDocuments: `maybe`,
        sort: `oldest`,
      }),
    ).toEqual({
      page: 1,
      pageSize: 10,
      query: ``,
      status: `all`,
      hasDocuments: `all`,
      hasPayments: `all`,
      sort: `recent_activity`,
    });
  });

  it(`uses the first value from array-based search params`, () => {
    expect(
      parseContractsSearchParams({
        page: [`4`, `5`],
        pageSize: [`20`, `50`],
        query: [`  Vendor One  `, `Vendor Two`],
        status: [`draft`, `completed`],
        hasDocuments: [`no`, `yes`],
        hasPayments: [`yes`, `no`],
        sort: [`name`, `payments_count`],
      }),
    ).toEqual({
      page: 4,
      pageSize: 20,
      query: `Vendor One`,
      status: `draft`,
      hasDocuments: `no`,
      hasPayments: `yes`,
      sort: `name`,
    });
  });

  it(`builds hrefs while clearing empty params`, () => {
    expect(
      buildContractsHref(`/contracts`, `page=2&pageSize=10&query=vendor&status=completed`, {
        query: `new vendor`,
        page: `1`,
        hasDocuments: `yes`,
      }),
    ).toBe(`/contracts?page=1&pageSize=10&query=new+vendor&status=completed&hasDocuments=yes`);

    expect(
      buildContractsHref(`/contracts`, `page=2&pageSize=10&query=vendor&sort=payments_count`, {
        query: null,
        sort: null,
      }),
    ).toBe(`/contracts?page=2&pageSize=10`);
  });
});
