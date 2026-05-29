import { describe, expect, it } from '@jest/globals';

import { buildContractDetailViewModel } from './contract-detail-model';

function createBaseContract() {
  return {
    id: `contract-1`,
    name: `Vendor LLC`,
    email: `vendor@example.com`,
    updatedAt: `2026-03-30T07:15:00.000Z`,
    address: null,
    summary: {
      lastStatus: `draft`,
      lastActivity: `2026-04-01T09:15:00.000Z`,
      lastRequestId: `payment-draft-1`,
      documentsCount: 1,
      paymentsCount: 2,
      completedPaymentsCount: 1,
      draftPaymentsCount: 1,
      pendingPaymentsCount: 0,
      waitingPaymentsCount: 0,
    },
    payments: [
      {
        id: `payment-completed-1`,
        amount: `$250.00`,
        status: `completed`,
        createdAt: `2026-04-01T08:15:00.000Z`,
        updatedAt: `2026-04-01T09:15:00.000Z`,
        role: `REQUESTER`,
        paymentRail: null,
      },
      {
        id: `payment-draft-1`,
        amount: `$100.00`,
        status: `draft`,
        createdAt: `2026-03-30T09:15:00.000Z`,
        updatedAt: `2026-03-31T09:15:00.000Z`,
        role: `REQUESTER`,
        paymentRail: null,
      },
    ],
    documents: [
      {
        id: `document-1`,
        name: `invoice.pdf`,
        downloadUrl: `https://example.com/document-1`,
        createdAt: `2026-03-30T08:15:00.000Z`,
        tags: [`invoice`],
        isAttachedToDraftPaymentRequest: false,
        attachedDraftPaymentRequestIds: [],
        isAttachedToNonDraftPaymentRequest: true,
        attachedNonDraftPaymentRequestIds: [`payment-completed-1`],
      },
    ],
  };
}

describe(`contract-detail-model`, () => {
  it(`prioritizes draft workflow over a newer closed payment`, () => {
    const model = buildContractDetailViewModel(createBaseContract(), `contract-1`, `/contracts`);

    expect(model.operatingPayment?.id).toBe(`payment-draft-1`);
    expect(model.activeWorkflow.title).toBe(`Draft waiting for review`);
    expect(model.readiness.label).toBe(`Draft requires requester action`);
  });

  it(`orders relationship timeline by most recent event first`, () => {
    const model = buildContractDetailViewModel(createBaseContract(), `contract-1`, `/contracts`);

    expect(model.timeline[0]?.id).toBe(`payment-status-payment-completed-1`);
    expect(model.timeline.at(-1)?.id).toBe(`contract-updated-contract-1`);
  });

  it(`tracks files linked and not linked to draft work`, () => {
    const model = buildContractDetailViewModel(createBaseContract(), `contract-1`, `/contracts`);

    expect(model.draftLinkedFilesCount).toBe(0);
    expect(model.filesWithoutDraftLinkCount).toBe(1);
  });
});
