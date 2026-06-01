import { ActionGhost } from '../../../../../components/action-ghost';
import { ContextStat } from '../../../../../components/context-stat';
import { type VerificationCasePageData } from '../page.loader';

export function VerificationContextRail({
  verificationCase,
  backToQueueHref,
}: {
  verificationCase: VerificationCasePageData[`verificationCase`];
  backToQueueHref: string;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <ContextStat
          label="Verification"
          value={verificationCase.verificationStatus}
          tone={verificationCase.verificationStatus === `APPROVED` ? `emerald` : `amber`}
        />
        <ContextStat
          label="Assignment"
          value={verificationCase.assignment.current ? `Assigned` : `Open`}
          tone={verificationCase.assignment.current ? `cyan` : `neutral`}
        />
        <ContextStat
          label="SLA"
          value={verificationCase.verificationSla.breached ? `Breached` : `Healthy`}
          tone={verificationCase.verificationSla.breached ? `rose` : `emerald`}
        />
        <ContextStat label="Documents" value={verificationCase._count.consumerResources} />
      </div>
      <div className="contextRailSection">
        <h4>Linked cases</h4>
        <div className="contextRailLinks">
          <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
          <ActionGhost href={`/consumers/${verificationCase.id}`}>Open consumer case</ActionGhost>
          <ActionGhost href={`/audit/admin-actions?resourceId=${verificationCase.id}`}>
            Related admin actions
          </ActionGhost>
        </div>
      </div>
    </>
  );
}
