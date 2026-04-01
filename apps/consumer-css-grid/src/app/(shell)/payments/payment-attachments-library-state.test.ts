import { describe, expect, it } from '@jest/globals';

import { getPaymentAttachmentsLibraryState } from './payment-attachments-library-state';

describe(`payment attachments library state`, () => {
  it(`keeps pagination available when the current page has zero attachable files`, () => {
    expect(
      getPaymentAttachmentsLibraryState({
        availableDocumentsCount: 10,
        attachableDocumentsCount: 0,
        availableDocumentsTotal: 30,
        availableDocumentsPage: 2,
        availableDocumentsPageSize: 10,
      }),
    ).toEqual({
      totalPages: 3,
      hasAttachableDocuments: false,
      showPagination: true,
      emptyMessage: `Page 2 has no attachable files. Try another page to find documents that are not already attached.`,
    });
  });

  it(`returns the empty-library state when no documents exist yet`, () => {
    expect(
      getPaymentAttachmentsLibraryState({
        availableDocumentsCount: 0,
        attachableDocumentsCount: 0,
        availableDocumentsTotal: 0,
        availableDocumentsPage: 1,
        availableDocumentsPageSize: 10,
      }),
    ).toEqual({
      totalPages: 1,
      hasAttachableDocuments: false,
      showPagination: false,
      emptyMessage: `No library documents yet. You can upload files directly above or manage the full library separately.`,
    });
  });
});
