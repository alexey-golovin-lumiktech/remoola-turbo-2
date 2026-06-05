import { type PayoutCasePageData } from './page.loader';
import { type PayoutCasePagePermissions } from './page.permissions';
import { derivePayoutViewModel } from './payout-view-model';
import { PayoutAuditSection } from './sections/PayoutAuditSection';
import { PayoutContextRail } from './sections/PayoutContextRail';
import { PayoutCoreLinksSection } from './sections/PayoutCoreLinksSection';
import { PayoutEscalationSection } from './sections/PayoutEscalationSection';
import { PayoutHeaderPanel } from './sections/PayoutHeaderPanel';
import { PayoutOutcomesSection } from './sections/PayoutOutcomesSection';
import { PayoutSummarySection } from './sections/PayoutSummarySection';
import { AssignmentCard } from '../../../../components/assignment-card';
import { WorkspaceLayout } from '../../../../components/workspace-layout';
import {
  claimPayoutAssignmentAction,
  reassignPayoutAssignmentAction,
  releasePayoutAssignmentAction,
} from '../../../../lib/admin-mutations/payouts.server';

export function PayoutCasePageView({
  data,
  permissions,
}: {
  data: PayoutCasePageData;
  permissions: PayoutCasePagePermissions;
}) {
  const { payoutCase, reassignCandidates, backToQueueHref } = data;
  const { canManageEscalation, canSubmitEscalation, canClaim, canRelease, canReassign } = permissions;
  const viewModel = derivePayoutViewModel(payoutCase, permissions);

  return (
    <WorkspaceLayout
      workspace="payout-case"
      context={<PayoutContextRail payoutCase={payoutCase} backToQueueHref={backToQueueHref} />}
      contextTitle="Payout snapshot"
      contextDescription="Status, escalation posture, and linked-case shortcuts for the current payout."
    >
      <>
        <PayoutHeaderPanel payoutCase={payoutCase} backToQueueHref={backToQueueHref} pills={viewModel.pills} />
        <PayoutSummarySection
          payoutCase={payoutCase}
          highValueThresholdLabel={viewModel.highValueThresholdLabel}
          destinationLabel={viewModel.destinationLabel}
        />
        <PayoutCoreLinksSection payoutCase={payoutCase} />
        <PayoutEscalationSection
          payoutCase={payoutCase}
          permissions={{ canManageEscalation, canSubmitEscalation }}
          viewModel={viewModel.escalation}
        />
        <PayoutOutcomesSection payoutCase={payoutCase} />
        <AssignmentCard
          resourceId={payoutCase.id}
          assignment={payoutCase.assignment}
          reassignCandidates={reassignCandidates}
          capabilities={{ canClaim, canRelease, canReassign }}
          actions={{
            claim: claimPayoutAssignmentAction,
            release: releasePayoutAssignmentAction,
            reassign: reassignPayoutAssignmentAction,
          }}
          copy={{ claimReasonPlaceholder: `Why are you claiming this payout?` }}
        />
        <PayoutAuditSection payoutCase={payoutCase} />
      </>
    </WorkspaceLayout>
  );
}
