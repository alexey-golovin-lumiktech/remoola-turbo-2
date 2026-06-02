import { type ExchangeScheduledCasePageData } from './page.loader';
import { type ExchangeScheduledCasePagePermissions } from './page.permissions';
import { ExchangeScheduledActionsSection } from './sections/ExchangeScheduledActionsSection';
import { ExchangeScheduledHeaderPanel } from './sections/ExchangeScheduledHeaderPanel';
import { ExchangeScheduledLedgerContextSection } from './sections/ExchangeScheduledLedgerContextSection';
import { ExchangeScheduledSummaryGrid } from './sections/ExchangeScheduledSummaryGrid';
import { AssignmentCard } from '../../../../../components/assignment-card';
import {
  claimFxConversionAssignmentAction,
  reassignFxConversionAssignmentAction,
  releaseFxConversionAssignmentAction,
} from '../../../../../lib/admin-mutations/exchange.server';

export function ExchangeScheduledCasePageView({
  data,
  permissions,
}: {
  data: ExchangeScheduledCasePageData;
  permissions: ExchangeScheduledCasePagePermissions;
}) {
  const { conversion, reassignCandidates } = data;
  const { canManage, canClaim, canRelease, canReassign } = permissions;

  return (
    <>
      <ExchangeScheduledHeaderPanel conversion={conversion} />
      <ExchangeScheduledSummaryGrid conversion={conversion} />
      <section className="detailGrid">
        <ExchangeScheduledLedgerContextSection conversion={conversion} />
        <ExchangeScheduledActionsSection conversion={conversion} canManage={canManage} />
      </section>
      <AssignmentCard
        resourceId={conversion.id}
        assignment={conversion.assignment}
        reassignCandidates={reassignCandidates}
        capabilities={{ canClaim, canRelease, canReassign }}
        actions={{
          claim: claimFxConversionAssignmentAction,
          release: releaseFxConversionAssignmentAction,
          reassign: reassignFxConversionAssignmentAction,
        }}
        copy={{ claimReasonPlaceholder: `Why are you claiming this scheduled FX conversion?` }}
      />
    </>
  );
}
