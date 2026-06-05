import { ActionGhost } from '../../../../../components/action-ghost';
import { ContextStat } from '../../../../../components/context-stat';
import { type PayoutCasePageData } from '../page.loader';

export function PayoutContextRail({
  payoutCase,
  backToQueueHref,
}: {
  payoutCase: PayoutCasePageData[`payoutCase`];
  backToQueueHref: PayoutCasePageData[`backToQueueHref`];
}) {
  const currentAssignment = payoutCase.assignment.current;
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <ContextStat label="Derived status" value={payoutCase.core.derivedStatus} tone="cyan" />
        <ContextStat
          label="Escalated"
          value={payoutCase.payoutEscalation ? `Yes` : `No`}
          tone={payoutCase.payoutEscalation ? `amber` : `neutral`}
        />
        <ContextStat
          label="Threshold"
          value={payoutCase.slaBreachDetected ? `Breached` : `Within SLA`}
          tone={payoutCase.slaBreachDetected ? `rose` : `emerald`}
        />
        <ContextStat
          label="Assignment"
          value={currentAssignment ? `Assigned` : `Open`}
          tone={currentAssignment ? `cyan` : `neutral`}
        />
      </div>
      <div className="contextRailSection">
        <h4>Quick links</h4>
        <div className="contextRailLinks">
          <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
          <ActionGhost href={`/consumers/${payoutCase.consumer.id}`}>Consumer case</ActionGhost>
          {payoutCase.paymentRequest ? (
            <ActionGhost href={`/payments/${payoutCase.paymentRequest.id}`}>Payment request</ActionGhost>
          ) : null}
          {payoutCase.destinationPaymentMethodSummary ? (
            <ActionGhost href={`/payment-methods/${payoutCase.destinationPaymentMethodSummary.id}`}>
              Destination method
            </ActionGhost>
          ) : null}
        </div>
      </div>
    </>
  );
}
