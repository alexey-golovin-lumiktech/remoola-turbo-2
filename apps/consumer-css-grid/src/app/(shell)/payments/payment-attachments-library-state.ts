export function getPaymentAttachmentsLibraryState(params: {
  availableDocumentsCount: number;
  attachableDocumentsCount: number;
  availableDocumentsTotal: number;
  availableDocumentsPage: number;
  availableDocumentsPageSize: number;
}) {
  const {
    availableDocumentsCount,
    attachableDocumentsCount,
    availableDocumentsTotal,
    availableDocumentsPage,
    availableDocumentsPageSize,
  } = params;
  const totalPages = Math.max(1, Math.ceil(availableDocumentsTotal / Math.max(1, availableDocumentsPageSize)));
  const hasLibraryDocuments = availableDocumentsTotal > 0 || availableDocumentsCount > 0;
  const hasAttachableDocuments = attachableDocumentsCount > 0;
  const hasOtherPages = totalPages > 1;

  if (!hasLibraryDocuments) {
    return {
      totalPages,
      hasAttachableDocuments,
      showPagination: false,
      emptyMessage: `No library documents yet. You can upload files directly above or manage the full library separately.`,
    };
  }

  if (hasAttachableDocuments) {
    return {
      totalPages,
      hasAttachableDocuments,
      showPagination: hasOtherPages,
      emptyMessage: null,
    };
  }

  const emptyMessage = hasOtherPages
    ? `Page ${availableDocumentsPage} has no attachable files. Try another page to find documents that are not already attached.`
    : `All currently available library documents are already attached to this draft.`;

  return {
    totalPages,
    hasAttachableDocuments,
    showPagination: hasOtherPages,
    emptyMessage,
  };
}
