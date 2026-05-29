import { describe, expect, it } from '@jest/globals';

import { buildDocumentsViewModel } from './documents-view-model';

describe(`documents-view-model`, () => {
  it(`derives filter counts, selection state, and blocked delete counts`, () => {
    const model = buildDocumentsViewModel({
      documents: [
        {
          id: `draft-doc`,
          name: `draft.pdf`,
          kind: `PAYMENT`,
          createdAt: `2026-04-01T10:00:00.000Z`,
          size: 100,
          downloadUrl: `https://example.com/draft.pdf`,
          tags: [],
          isAttachedToDraftPaymentRequest: true,
          attachedDraftPaymentRequestIds: [`payment-draft-1`],
          isAttachedToNonDraftPaymentRequest: false,
          attachedNonDraftPaymentRequestIds: [],
        },
        {
          id: `free-doc`,
          name: `free.pdf`,
          kind: `GENERAL`,
          createdAt: `2026-04-02T10:00:00.000Z`,
          size: 100,
          downloadUrl: `https://example.com/free.pdf`,
          tags: [],
          isAttachedToDraftPaymentRequest: false,
          attachedDraftPaymentRequestIds: [],
          isAttachedToNonDraftPaymentRequest: false,
          attachedNonDraftPaymentRequestIds: [],
        },
      ],
      total: 2,
      pageSize: 20,
      contractContext: null,
      filterKind: `all`,
      selectedDocumentIds: [`free-doc`],
    });

    expect(model.paymentCount).toBe(1);
    expect(model.generalCount).toBe(1);
    expect(model.blockedDraftDeleteCount).toBe(1);
    expect(model.blockedNonDraftDeleteCount).toBe(0);
    expect(model.allDeletableSelected).toBe(true);
  });
});
