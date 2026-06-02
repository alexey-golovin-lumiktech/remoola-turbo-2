import { type LedgerEntryCasePageData } from './page.loader';
import { type LedgerEntryCasePagePermissions } from './page.permissions';
import { LedgerEntryAuditSection } from './sections/LedgerEntryAuditSection';
import { LedgerEntryContextRail } from './sections/LedgerEntryContextRail';
import { LedgerEntryDisputesGrid } from './sections/LedgerEntryDisputesGrid';
import { LedgerEntryHeaderPanel } from './sections/LedgerEntryHeaderPanel';
import { LedgerEntryMetadataGrid } from './sections/LedgerEntryMetadataGrid';
import { LedgerEntrySummaryGrid } from './sections/LedgerEntrySummaryGrid';
import { AssignmentCard } from '../../../../components/assignment-card';
import { WorkspaceLayout } from '../../../../components/workspace-layout';
import {
  reassignLedgerEntryAssignmentAction,
  releaseLedgerEntryAssignmentAction,
  claimLedgerEntryAssignmentAction,
} from '../../../../lib/admin-mutations/ledger.server';

export function LedgerEntryCasePageView({
  data,
  permissions,
}: {
  data: LedgerEntryCasePageData;
  permissions: LedgerEntryCasePagePermissions;
}) {
  const { ledgerCase, reassignCandidates, backToQueueHref } = data;
  const { canClaim, canRelease, canReassign } = permissions;

  return (
    <WorkspaceLayout
      workspace="ledger-case"
      context={<LedgerEntryContextRail ledgerCase={ledgerCase} backToQueueHref={backToQueueHref} />}
      contextTitle="Ledger snapshot"
      contextDescription="Entry status, dispute posture, and related links for the current ledger investigation."
    >
      <>
        <LedgerEntryHeaderPanel ledgerCase={ledgerCase} backToQueueHref={backToQueueHref} />
        <LedgerEntrySummaryGrid ledgerCase={ledgerCase} />
        <LedgerEntryMetadataGrid ledgerCase={ledgerCase} />
        <LedgerEntryDisputesGrid ledgerCase={ledgerCase} />
        <AssignmentCard
          resourceId={ledgerCase.id}
          assignment={ledgerCase.assignment}
          reassignCandidates={reassignCandidates}
          capabilities={{ canClaim, canRelease, canReassign }}
          actions={{
            claim: claimLedgerEntryAssignmentAction,
            release: releaseLedgerEntryAssignmentAction,
            reassign: reassignLedgerEntryAssignmentAction,
          }}
          copy={{ claimReasonPlaceholder: `Why are you claiming this entry?` }}
        />
        <LedgerEntryAuditSection ledgerCase={ledgerCase} />
      </>
    </WorkspaceLayout>
  );
}
