import { ActionGhost } from '../../../../../components/action-ghost';
import { Panel } from '../../../../../components/panel';
import { TinyPill } from '../../../../../components/tiny-pill';
import {
  actionGroupClass,
  actionGroupLabelClass,
  monoMutedTextClass,
  mutedTextClass,
} from '../../../../../components/ui-classes';
import { type PaymentPageData } from '../page.loader';

export function PaymentHeaderPanel({
  paymentCase,
  backToQueueHref,
}: {
  paymentCase: PaymentPageData[`paymentCase`];
  backToQueueHref: string;
}) {
  return (
    <Panel
      eyebrow="Payment case"
      title="Payment Request"
      description={paymentCase.id}
      actions={
        <div className="flex flex-wrap gap-4">
          <div className={actionGroupClass}>
            <span className={actionGroupLabelClass}>Queue</span>
            <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
            <ActionGhost href={`/audit/admin-actions?resourceId=${paymentCase.id}`}>Related admin actions</ActionGhost>
          </div>
          <div className={actionGroupClass}>
            <span className={actionGroupLabelClass}>Linked cases</span>
            {paymentCase.payer.id ? (
              <ActionGhost href={`/consumers/${paymentCase.payer.id}`}>Payer case</ActionGhost>
            ) : null}
            {paymentCase.requester.id ? (
              <ActionGhost href={`/consumers/${paymentCase.requester.id}`}>Requester case</ActionGhost>
            ) : null}
          </div>
        </div>
      }
      surface="primary"
    >
      <p className={mutedTextClass}>
        Investigation summary for payment state, linked parties, assignment status, ledger context, and related audit
        history.
      </p>
      <p className={monoMutedTextClass}>{paymentCase.id}</p>
      <div className="pillRow">
        <TinyPill>{paymentCase.core.effectiveStatus}</TinyPill>
        <TinyPill tone="cyan">
          {paymentCase.core.amount} {paymentCase.core.currencyCode}
        </TinyPill>
        <TinyPill>{paymentCase.core.currencyCode}</TinyPill>
        {paymentCase.core.paymentRail ? <TinyPill>{paymentCase.core.paymentRail}</TinyPill> : null}
        {paymentCase.staleWarning ? <TinyPill>Persisted status stale</TinyPill> : null}
        {paymentCase.core.deletedAt ? <TinyPill>Soft-deleted request</TinyPill> : null}
      </div>
    </Panel>
  );
}
