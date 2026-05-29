import { ActionGhost } from '../../../../../components/action-ghost';
import { Panel } from '../../../../../components/panel';
import { StatusPill } from '../../../../../components/status-pill';
import { actionGroupClass, actionGroupLabelClass } from '../../../../../components/ui-classes';
import { type ConsumerPageData } from '../page.loader';
import { renderConsumerLabel } from '../preview-helpers';

export function ConsumerHeaderPanel({
  consumer,
  backToQueueHref,
}: {
  consumer: ConsumerPageData[`consumer`];
  backToQueueHref: string;
}) {
  return (
    <Panel
      eyebrow="Consumer case"
      title={renderConsumerLabel(consumer.email, consumer.id)}
      description={consumer.id}
      actions={
        <div className="flex flex-wrap gap-4">
          <div className={actionGroupClass}>
            <span className={actionGroupLabelClass}>Queue</span>
            <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
            <ActionGhost href={`/verification/${consumer.id}`}>Verification case</ActionGhost>
          </div>
          <div className={actionGroupClass}>
            <span className={actionGroupLabelClass}>Audit</span>
            <ActionGhost href={`/audit/consumer-actions?consumerId=${consumer.id}`}>Consumer actions</ActionGhost>
            <ActionGhost href={`/audit/admin-actions?resourceId=${consumer.id}`}>Related admin actions</ActionGhost>
          </div>
        </div>
      }
      surface="primary"
    >
      <p className="muted">
        Consumer case summary for review, identity status, support actions, and cross-links into verification, audit,
        payment methods, and recent payment activity.
      </p>
      <div className="pillRow">
        <StatusPill status={consumer.verificationStatus} />
        <span className="pill">{consumer.accountType}</span>
        {consumer.contractorKind ? <span className="pill">{consumer.contractorKind}</span> : null}
        {consumer.suspendedAt ? (
          <span className="pill" data-tone="rose">
            Suspended
          </span>
        ) : null}
      </div>
    </Panel>
  );
}
