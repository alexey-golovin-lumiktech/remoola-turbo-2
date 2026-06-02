import { getDocumentCaseResult, getDocumentTags } from '../../../../lib/admin-api/documents.server';
import { getAdminIdentity } from '../../../../lib/admin-api/identity.server';
import { loadReassignCandidates, type ReassignCandidate } from '../../../../lib/admin-permissions/reassign-candidates';
import { readReturnTo } from '../../../../lib/navigation-context';

type DocumentCaseResult = Awaited<ReturnType<typeof getDocumentCaseResult>>;
type DocumentCaseReady = Extract<DocumentCaseResult, { status: `ready` }>;
type Identity = Awaited<ReturnType<typeof getAdminIdentity>>;
type DocumentTagsResponse = Awaited<ReturnType<typeof getDocumentTags>>;

export type DocumentCasePageData = {
  identity: Identity;
  documentCase: DocumentCaseReady[`data`];
  tags: DocumentTagsResponse;
  reassignCandidates: ReassignCandidate[];
  backToQueueHref: string;
};

type DocumentCasePageLoadResult =
  | { status: `ready`; data: DocumentCasePageData }
  | { status: `not_found` }
  | { status: `forbidden` }
  | { status: `error` };

export async function loadDocumentCasePage({
  documentId,
  searchParams,
}: {
  documentId: string;
  searchParams: { from?: string } | undefined;
}): Promise<DocumentCasePageLoadResult> {
  const [identity, documentCaseResult, tags] = await Promise.all([
    getAdminIdentity(),
    getDocumentCaseResult(documentId),
    getDocumentTags(),
  ]);

  if (documentCaseResult.status === `not_found`) {
    return { status: `not_found` };
  }
  if (documentCaseResult.status === `forbidden`) {
    return { status: `forbidden` };
  }
  if (documentCaseResult.status === `error`) {
    return { status: `error` };
  }

  const documentCase = documentCaseResult.data;
  const canReassign = Boolean(documentCase.assignment.current && identity?.role === `SUPER_ADMIN`);
  const reassignCandidates = await loadReassignCandidates({ canReassign, assignment: documentCase.assignment });
  const backToQueueHref = readReturnTo(searchParams?.from, `/documents`);

  return {
    status: `ready`,
    data: { identity, documentCase, tags, reassignCandidates, backToQueueHref },
  };
}
