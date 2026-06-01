import { type VerificationCasePageData } from './page.loader';
import { type VerificationCasePagePermissions } from './page.permissions';
import { VerificationAuditSection } from './sections/VerificationAuditSection';
import { VerificationContextRail } from './sections/VerificationContextRail';
import { VerificationDecisionActions } from './sections/VerificationDecisionActions';
import { VerificationHeaderPanel } from './sections/VerificationHeaderPanel';
import { VerificationSummaryGrid } from './sections/VerificationSummaryGrid';
import { AssignmentCard } from '../../../../components/assignment-card';
import { WorkspaceLayout } from '../../../../components/workspace-layout';
import {
  claimVerificationAssignmentAction,
  reassignVerificationAssignmentAction,
  releaseVerificationAssignmentAction,
} from '../../../../lib/admin-mutations/verification.server';

export function VerificationCasePageView({
  data,
  permissions,
}: {
  data: VerificationCasePageData;
  permissions: VerificationCasePagePermissions;
}) {
  const { verificationCase, reassignCandidates, backToQueueHref } = data;
  const { canClaim, canRelease, canReassign } = permissions;

  return (
    <WorkspaceLayout
      workspace="verification-case"
      context={<VerificationContextRail verificationCase={verificationCase} backToQueueHref={backToQueueHref} />}
      contextTitle="Verification context"
      contextDescription="Operational posture, assignment state, and quick links for the current review."
    >
      <>
        <VerificationHeaderPanel verificationCase={verificationCase} backToQueueHref={backToQueueHref} />
        <VerificationSummaryGrid verificationCase={verificationCase} />
        <AssignmentCard
          resourceId={verificationCase.id}
          assignment={verificationCase.assignment}
          reassignCandidates={reassignCandidates}
          capabilities={{ canClaim, canRelease, canReassign }}
          actions={{
            claim: claimVerificationAssignmentAction,
            release: releaseVerificationAssignmentAction,
            reassign: reassignVerificationAssignmentAction,
          }}
          copy={{ claimReasonPlaceholder: `Why are you claiming this case?` }}
        />
        <VerificationDecisionActions verificationCase={verificationCase} />
        <VerificationAuditSection verificationCase={verificationCase} />
      </>
    </WorkspaceLayout>
  );
}
