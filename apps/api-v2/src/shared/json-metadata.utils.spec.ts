import { describe, expect, it } from '@jest/globals';

import { $Enums } from '@remoola/database-2';

import { parseLedgerMetadata } from './json-metadata.utils';

describe(`json metadata utils`, () => {
  it(`parses known ledger metadata fields`, () => {
    expect(
      parseLedgerMetadata({
        rail: $Enums.PaymentRail.CARD,
        paymentMethodId: `pm-1`,
        counterpartyId: `consumer-2`,
        from: `USD`,
        to: `EUR`,
      }),
    ).toEqual({
      rail: $Enums.PaymentRail.CARD,
      paymentMethodId: `pm-1`,
      counterpartyId: `consumer-2`,
      from: `USD`,
      to: `EUR`,
    });
  });

  it(`drops unknown rail values and non-string optional fields`, () => {
    expect(
      parseLedgerMetadata({
        rail: `not-a-rail`,
        paymentMethodId: 42,
        counterpartyId: null,
        from: ``,
        to: `GBP`,
      }),
    ).toEqual({
      rail: null,
      paymentMethodId: null,
      counterpartyId: null,
      from: null,
      to: `GBP`,
    });
  });
});
