import { describe, expect, it } from '@jest/globals';

import { buildPaymentsListQuery, formatPaymentTypeLabel } from './payments-list-query';

describe(`payments list query`, () => {
  it(`includes type alongside the existing filters`, () => {
    expect(
      buildPaymentsListQuery({
        search: `known-start-payment@example.com`,
        status: `PENDING`,
        type: `BANK_TRANSFER`,
        role: `PAYER`,
        page: 2,
        pageSize: 20,
      }),
    ).toBe(`search=known-start-payment%40example.com&status=PENDING&type=BANK_TRANSFER&role=PAYER&page=2&pageSize=20`);
  });

  it(`omits empty filters while preserving pagination`, () => {
    expect(
      buildPaymentsListQuery({
        search: `   `,
        status: ``,
        type: ``,
        role: ``,
        page: 1,
        pageSize: 50,
      }),
    ).toBe(`page=1&pageSize=50`);
  });
});

describe(`payment type labels`, () => {
  it(`maps backend payment types to user-facing labels`, () => {
    expect(formatPaymentTypeLabel(`CREDIT_CARD`)).toBe(`Card`);
    expect(formatPaymentTypeLabel(`BANK_TRANSFER`)).toBe(`Bank transfer`);
    expect(formatPaymentTypeLabel(`CURRENCY_EXCHANGE`)).toBe(`Exchange`);
  });
});
