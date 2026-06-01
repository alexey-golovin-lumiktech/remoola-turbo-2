import { ActionGhost } from '../../../../../components/action-ghost';
import { ContextStat } from '../../../../../components/context-stat';
import { type PaymentPageData } from '../page.loader';

export function PaymentContextRail({
  paymentCase,
  backToQueueHref,
}: {
  paymentCase: PaymentPageData[`paymentCase`];
  backToQueueHref: string;
}) {
  const currentAssignment = paymentCase.assignment.current;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <ContextStat label="Effective status" value={paymentCase.core.effectiveStatus} tone="cyan" />
        <ContextStat
          label="Assignment"
          value={currentAssignment ? `Assigned` : `Unassigned`}
          tone={currentAssignment ? `cyan` : `neutral`}
        />
        <ContextStat label="Attachments" value={paymentCase.attachments.length} />
        <ContextStat label="Ledger entries" value={paymentCase.ledgerEntries.length} />
      </div>
      <div className="contextRailSection">
        <h4>Quick links</h4>
        <div className="contextRailLinks">
          <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
          {paymentCase.payer.id ? (
            <ActionGhost href={`/consumers/${paymentCase.payer.id}`}>Payer case</ActionGhost>
          ) : null}
          {paymentCase.requester.id ? (
            <ActionGhost href={`/consumers/${paymentCase.requester.id}`}>Requester case</ActionGhost>
          ) : null}
          <ActionGhost href={`/audit/admin-actions?resourceId=${paymentCase.id}`}>Related admin actions</ActionGhost>
        </div>
      </div>
    </>
  );
}
