import { type DocumentCasePageData } from './page.loader';
import { type DocumentCasePagePermissions } from './page.permissions';
import { DocumentActionsSection } from './sections/DocumentActionsSection';
import { DocumentContextRail } from './sections/DocumentContextRail';
import { DocumentHeaderPanel } from './sections/DocumentHeaderPanel';
import { DocumentMetadataSection } from './sections/DocumentMetadataSection';
import { DocumentSummaryGrid } from './sections/DocumentSummaryGrid';
import { AssignmentCard } from '../../../../components/assignment-card';
import { WorkspaceLayout } from '../../../../components/workspace-layout';
import {
  reassignDocumentAssignmentAction,
  releaseDocumentAssignmentAction,
  claimDocumentAssignmentAction,
} from '../../../../lib/admin-mutations/documents.server';

export function DocumentCasePageView({
  data,
  permissions,
}: {
  data: DocumentCasePageData;
  permissions: DocumentCasePagePermissions;
}) {
  const { documentCase, tags, reassignCandidates, backToQueueHref } = data;
  const { canManage, canClaim, canRelease, canReassign } = permissions;

  return (
    <WorkspaceLayout
      workspace="document-case"
      context={<DocumentContextRail documentCase={documentCase} backToQueueHref={backToQueueHref} />}
      contextTitle="Document snapshot"
      contextDescription="Evidence context, assignment state, and linked-case shortcuts for the current document."
    >
      <>
        <DocumentHeaderPanel documentCase={documentCase} backToQueueHref={backToQueueHref} />
        <DocumentSummaryGrid documentCase={documentCase} />
        <AssignmentCard
          resourceId={documentCase.id}
          assignment={documentCase.assignment}
          reassignCandidates={reassignCandidates}
          capabilities={{ canClaim, canRelease, canReassign }}
          actions={{
            claim: claimDocumentAssignmentAction,
            release: releaseDocumentAssignmentAction,
            reassign: reassignDocumentAssignmentAction,
          }}
          copy={{ claimReasonPlaceholder: `Why are you claiming this document?` }}
        />
        <DocumentMetadataSection documentCase={documentCase} tags={tags} />
        <DocumentActionsSection documentCase={documentCase} tags={tags} canManage={canManage} />
      </>
    </WorkspaceLayout>
  );
}
