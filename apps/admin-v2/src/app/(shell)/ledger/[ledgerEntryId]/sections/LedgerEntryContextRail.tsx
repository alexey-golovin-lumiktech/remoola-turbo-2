import { ActionGhost } from '../../../../../components/action-ghost';
import { ContextStat } from '../../../../../components/context-stat';
import { type LedgerEntryCasePageData } from '../page.loader';

export function LedgerEntryContextRail({
  ledgerCase,
  backToQueueHref,
}: {
  ledgerCase: LedgerEntryCasePageData[`ledgerCase`];
  backToQueueHref: string;
}) {
  const currentAssignment = ledgerCase.assignment.current;

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <ContextStat label="Effective status" value={ledgerCase.core.effectiveStatus} tone="cyan" />
        <ContextStat
          label="Disputes"
          value={ledgerCase.disputes.length}
          tone={ledgerCase.disputes.length > 0 ? `amber` : `neutral`}
        />
        <ContextStat
          label="Assignment"
          value={currentAssignment ? `Assigned` : `Open`}
          tone={currentAssignment ? `cyan` : `neutral`}
        />
        <ContextStat label="Related entries" value={ledgerCase.relatedEntries.length} />
      </div>
      <div className="contextRailSection">
        <h4>Jump to</h4>
        <div className="contextRailLinks">
          <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
          <ActionGhost href={`/consumers/${ledgerCase.consumer.id}`}>Consumer case</ActionGhost>
          {ledgerCase.paymentRequest ? (
            <ActionGhost href={`/payments/${ledgerCase.paymentRequest.id}`}>Payment request</ActionGhost>
          ) : null}
        </div>
      </div>
    </>
  );
}
