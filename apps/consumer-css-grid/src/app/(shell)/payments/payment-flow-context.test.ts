import { describe, expect, it } from '@jest/globals';

import {
  buildPaymentDocumentsHref,
  buildPaymentDetailHref,
  buildPaymentEntryHref,
  getPaymentFlowBackHref,
  getStartPaymentResultHref,
  parsePaymentFlowContext,
} from './payment-flow-context';

describe(`payment flow context helpers`, () => {
  it(`parses contract-aware flow context with a safe default return path`, () => {
    expect(
      parsePaymentFlowContext({
        contractId: `contract-1`,
        returnTo: undefined,
      }),
    ).toEqual({
      contractId: `contract-1`,
      returnTo: `/contracts/contract-1`,
    });
  });

  it(`drops unsafe returnTo values`, () => {
    expect(
      parsePaymentFlowContext({
        contractId: `contract-1`,
        returnTo: `https://evil.example/steal`,
      }),
    ).toEqual({
      contractId: `contract-1`,
      returnTo: `/contracts/contract-1`,
    });
  });

  it(`builds payment entry and detail hrefs with preserved context`, () => {
    const context = {
      contractId: `contract-1`,
      returnTo: `/contracts/contract-1`,
    };

    expect(
      buildPaymentEntryHref(`/payments/new-request`, {
        email: `Vendor@example.com`,
        ...context,
      }),
    ).toBe(`/payments/new-request?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1&email=vendor%40example.com`);
    expect(buildPaymentDetailHref(`payment-1`, context)).toBe(
      `/payments/payment-1?contractId=contract-1&returnTo=%2Fcontracts%2Fcontract-1`,
    );
  });

  it(`builds a contract-aware documents href from payment flow context`, () => {
    expect(
      buildPaymentDocumentsHref({
        contractId: `contract-1`,
        returnTo: `/contracts/contract-1?returnTo=%2Fcontracts%3Fstatus%3Dwaiting`,
      }),
    ).toBe(
      `/documents?contactId=contract-1&returnTo=%2Fcontracts%2Fcontract-1%3FreturnTo%3D%2Fcontracts%3Fstatus%3Dwaiting`,
    );
  });

  it(`falls back to payments index when no context is present`, () => {
    expect(getPaymentFlowBackHref(null)).toBe(`/payments`);
  });

  it(`falls back to the contract when a start-payment result has no id but contract context exists`, () => {
    expect(
      getStartPaymentResultHref(undefined, {
        contractId: `contract-1`,
        returnTo: `/contracts/contract-1?returnTo=%2Fcontracts%3Fpage%3D2`,
      }),
    ).toBe(`/contracts/contract-1?returnTo=/contracts?page=2`);
  });

  it(`falls back to pending payer payments when a start-payment result has no contract context`, () => {
    expect(getStartPaymentResultHref(``, null)).toBe(`/payments?role=PAYER&status=PENDING`);
  });
});
