import { Panel } from '../../../../../components/panel';
import { operatorFormClass } from '../../../../../components/ui-classes';
import { AddConsumerFlagForm } from '../forms/AddConsumerFlagForm';
import { CreateConsumerNoteForm } from '../forms/CreateConsumerNoteForm';
import { ResendConsumerEmailButtons } from '../forms/ResendConsumerEmailButtons';
import { SuspendConsumerForm } from '../forms/SuspendConsumerForm';
import { type ConsumerPagePermissions } from '../page.permissions';

export function ConsumerSupportActionsSection({
  consumerId,
  permissions,
}: {
  consumerId: string;
  permissions: ConsumerPagePermissions;
}) {
  const { canManageNotes, canManageFlags, canSuspend, canResendEmail, canResendSignupVerification } = permissions;
  return (
    <section className="detailGrid">
      <Panel
        eyebrow="Operator actions"
        title="Consumer support actions"
        description="Limited support actions only: suspension and explicit email resend. No general consumer edits."
        surface="support"
      >
        <div className={operatorFormClass}>
          {canSuspend ? <SuspendConsumerForm consumerId={consumerId} /> : null}
          {canResendEmail ? (
            <ResendConsumerEmailButtons
              consumerId={consumerId}
              canResendSignupVerification={canResendSignupVerification}
            />
          ) : null}
        </div>
      </Panel>
      <Panel
        eyebrow="Internal note"
        title="Add internal note"
        description="Capture investigation context, escalation notes, or the next operator step."
        surface="support"
      >
        {canManageNotes ? (
          <CreateConsumerNoteForm consumerId={consumerId} />
        ) : (
          <p className="muted">Internal note creation is not available for this admin identity.</p>
        )}
      </Panel>
      <Panel
        eyebrow="Flagging"
        title="Add flag"
        description="Create a durable review marker and short operator-visible reason."
        surface="support"
      >
        {canManageFlags ? (
          <AddConsumerFlagForm consumerId={consumerId} />
        ) : (
          <p className="muted">Consumer flag management is not available for this admin identity.</p>
        )}
      </Panel>
    </section>
  );
}
