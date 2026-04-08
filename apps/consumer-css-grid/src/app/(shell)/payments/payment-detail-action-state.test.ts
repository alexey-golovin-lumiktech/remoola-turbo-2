import { describe, expect, it } from '@jest/globals';

import { getPaymentDetailActionState } from './payment-detail-action-state';

describe(`payment detail action state`, () => {
  it(`keeps draft requester send flow primary while hiding invoice generation until the request leaves draft`, () => {
    expect(
      getPaymentDetailActionState({
        status: `DRAFT`,
        role: `REQUESTER`,
        paymentRail: null,
      }),
    ).toMatchObject({
      canSend: true,
      canGenerateInvoice: false,
      canPayWithCard: false,
      isBankTransferPending: false,
      invoiceSourceLabel: `current draft details`,
      aside: `Draft request`,
      showEmptyState: false,
    });
  });

  it(`exposes requester invoice tools on non-draft payment detail without reopening payer actions`, () => {
    expect(
      getPaymentDetailActionState({
        status: `COMPLETED`,
        role: `REQUESTER`,
        paymentRail: `CARD`,
      }),
    ).toMatchObject({
      canSend: false,
      canGenerateInvoice: true,
      canPayWithCard: false,
      isBankTransferPending: false,
      invoiceSourceLabel: `current payment details`,
      aside: `Requester tools`,
      showEmptyState: false,
    });
  });

  it(`keeps pending bank-transfer payer detail free of card or invoice actions`, () => {
    expect(
      getPaymentDetailActionState({
        status: `PENDING`,
        role: `PAYER`,
        paymentRail: `BANK_TRANSFER`,
      }),
    ).toMatchObject({
      canSend: false,
      canGenerateInvoice: false,
      canPayWithCard: false,
      isBankTransferPending: true,
      aside: `Payment pending`,
      showEmptyState: false,
    });
  });
});
