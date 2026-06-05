import { ActionGhost } from '../../../../../components/action-ghost';
import { Panel } from '../../../../../components/panel';
import { TinyPill } from '../../../../../components/tiny-pill';
import {
  actionGroupClass,
  actionGroupLabelClass,
  monoMutedTextClass,
  mutedTextClass,
} from '../../../../../components/ui-classes';
import { type PayoutCasePageData } from '../page.loader';

export function PayoutHeaderPanel({
  payoutCase,
  backToQueueHref,
  pills,
}: {
  payoutCase: PayoutCasePageData[`payoutCase`];
  backToQueueHref: PayoutCasePageData[`backToQueueHref`];
  pills: string[];
}) {
  return (
    <Panel
      eyebrow="Payout case"
      title="Payout case"
      description={payoutCase.id}
      actions={
        <div className="flex flex-wrap gap-4">
          <div className={actionGroupClass}>
            <span className={actionGroupLabelClass}>Queue</span>
            <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
            <ActionGhost href={`/ledger/${payoutCase.id}`}>Open ledger case</ActionGhost>
          </div>
          <div className={actionGroupClass}>
            <span className={actionGroupLabelClass}>Linked cases</span>
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
      }
      surface="primary"
    >
      <p className={monoMutedTextClass}>{payoutCase.id}</p>
      <p className={mutedTextClass}>
        Detail surface for payout status interpretation, escalation markers, assignment handling and linked
        ledger/payment context.
      </p>
      <div className="pillRow">
        {pills.map((pill) => (
          <TinyPill key={pill}>{pill}</TinyPill>
        ))}
      </div>
    </Panel>
  );
}
