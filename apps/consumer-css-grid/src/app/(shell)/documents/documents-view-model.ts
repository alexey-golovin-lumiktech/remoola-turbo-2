import { getDeleteBlockedMessage, isDeleteBlocked, type DocumentItem } from './document-helpers';
import { getContextualHelpGuides, HELP_CONTEXT_ROUTE } from '../../../features/help/get-contextual-help-guides';
import { HELP_GUIDE_SLUG } from '../../../features/help/guide-registry';

type ContractContext = {
  id: string;
  name: string;
  email: string;
  returnTo: string;
  draftPaymentRequestIds: string[];
} | null;

type Input = {
  documents: DocumentItem[];
  total: number;
  pageSize: number;
  contractContext: ContractContext;
  filterKind: string;
  selectedDocumentIds: string[];
};

export function buildDocumentsViewModel({
  documents,
  total,
  pageSize,
  contractContext,
  filterKind,
  selectedDocumentIds,
}: Input) {
  const contractsCount = documents.filter((doc) => doc.kind === `CONTRACT`).length;
  const complianceCount = documents.filter((doc) => doc.kind === `COMPLIANCE`).length;
  const paymentCount = documents.filter((doc) => doc.kind === `PAYMENT`).length;
  const generalCount = documents.filter((doc) => doc.kind === `GENERAL`).length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const hasDocumentsOnAnotherPage = documents.length === 0 && total > 0;
  const isContractMode = Boolean(contractContext);
  const filteredDocuments =
    filterKind === `all` ? documents : documents.filter((document) => document.kind === filterKind);
  const deletableDocumentIds = filteredDocuments.filter((doc) => !isDeleteBlocked(doc)).map((doc) => doc.id);
  const deletableDocumentIdSet = new Set(deletableDocumentIds);
  const blockedDraftDeleteCount = filteredDocuments.filter(
    (doc) => doc.isAttachedToDraftPaymentRequest && !doc.isAttachedToNonDraftPaymentRequest,
  ).length;
  const blockedNonDraftDeleteCount = filteredDocuments.filter((doc) => doc.isAttachedToNonDraftPaymentRequest).length;
  const allDeletableSelected =
    deletableDocumentIds.length > 0 &&
    deletableDocumentIds.every((documentId) => selectedDocumentIds.includes(documentId));

  return {
    allDeletableSelected,
    blockedDraftDeleteCount,
    blockedNonDraftDeleteCount,
    complianceCount,
    contractsCount,
    deleteBlockedHelpGuides: getContextualHelpGuides({
      route: HELP_CONTEXT_ROUTE.DOCUMENTS,
      preferredSlugs: [HELP_GUIDE_SLUG.DOCUMENTS_COMMON_ISSUES],
      limit: 1,
    }),
    deletableDocumentIdSet,
    deletableDocumentIds,
    documentsHelpGuides: getContextualHelpGuides({
      route: HELP_CONTEXT_ROUTE.DOCUMENTS,
      preferredSlugs: [
        HELP_GUIDE_SLUG.DOCUMENTS_OVERVIEW,
        HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH,
        HELP_GUIDE_SLUG.DOCUMENTS_COMMON_ISSUES,
      ],
      limit: 3,
    }),
    emptyStateHelpGuides: getContextualHelpGuides({
      route: HELP_CONTEXT_ROUTE.DOCUMENTS,
      preferredSlugs: [HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH, HELP_GUIDE_SLUG.DOCUMENTS_OVERVIEW],
      limit: 2,
    }),
    filteredDocuments,
    filterOptions: [
      { value: `all`, label: `All`, count: documents.length },
      { value: `PAYMENT`, label: `Payment`, count: paymentCount },
      { value: `COMPLIANCE`, label: `Compliance`, count: complianceCount },
      { value: `CONTRACT`, label: `Contract`, count: contractsCount },
      { value: `GENERAL`, label: `General`, count: generalCount },
    ],
    generalCount,
    getDeleteBlockedMessageForSelection: (ids: string[]) => getDeleteBlockedMessage(ids, filteredDocuments),
    hasDocumentsOnAnotherPage,
    isContractMode,
    paymentCount,
    blockedStateHelpGuides: getContextualHelpGuides({
      route: HELP_CONTEXT_ROUTE.DOCUMENTS,
      preferredSlugs: [HELP_GUIDE_SLUG.DOCUMENTS_COMMON_ISSUES, HELP_GUIDE_SLUG.DOCUMENTS_UPLOAD_AND_ATTACH],
      limit: 2,
    }),
    totalPages,
  };
}
