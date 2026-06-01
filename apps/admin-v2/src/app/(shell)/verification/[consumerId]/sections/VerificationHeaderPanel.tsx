import { ActionGhost } from '../../../../../components/action-ghost';
import { Panel } from '../../../../../components/panel';
import { TinyPill } from '../../../../../components/tiny-pill';
import { actionGroupClass, actionGroupLabelClass, monoMutedTextClass } from '../../../../../components/ui-classes';
import { type VerificationCasePageData } from '../page.loader';

export function VerificationHeaderPanel({
  verificationCase,
  backToQueueHref,
}: {
  verificationCase: VerificationCasePageData[`verificationCase`];
  backToQueueHref: string;
}) {
  return (
    <Panel
      eyebrow="Verification review"
      title="Verification Case"
      description={verificationCase.email}
      actions={
        <div className="flex flex-wrap gap-4">
          <div className={actionGroupClass}>
            <span className={actionGroupLabelClass}>Queue</span>
            <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
            <ActionGhost href={`/audit/admin-actions?resourceId=${verificationCase.id}`}>
              Related admin actions
            </ActionGhost>
          </div>
          <div className={actionGroupClass}>
            <span className={actionGroupLabelClass}>Linked case</span>
            <ActionGhost href={`/consumers/${verificationCase.id}`}>Open consumer case</ActionGhost>
          </div>
        </div>
      }
      surface="primary"
    >
      <p className={monoMutedTextClass}>{verificationCase.id}</p>
      <div className="pillRow">
        <TinyPill>{verificationCase.verificationStatus}</TinyPill>
        <TinyPill>{verificationCase.accountType}</TinyPill>
        {verificationCase.contractorKind ? <TinyPill>{verificationCase.contractorKind}</TinyPill> : null}
        {verificationCase.verificationSla.breached ? <TinyPill>SLA breached</TinyPill> : null}
      </div>
    </Panel>
  );
}
