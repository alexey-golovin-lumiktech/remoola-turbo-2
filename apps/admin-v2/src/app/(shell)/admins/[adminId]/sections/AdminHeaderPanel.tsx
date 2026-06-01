import { ActionGhost } from '../../../../../components/action-ghost';
import { Panel } from '../../../../../components/panel';
import { type AdminCasePageData } from '../page.loader';

export function AdminHeaderPanel({
  admin,
  backToQueueHref,
}: {
  admin: AdminCasePageData[`admin`];
  backToQueueHref: string;
}) {
  return (
    <Panel
      eyebrow="Admin record"
      title={admin.core.email}
      description={admin.core.id}
      actions={
        <div className="flex flex-wrap gap-2">
          <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
          <ActionGhost href={admin.auditShortcuts.adminActionsHref}>Related admin actions</ActionGhost>
          <ActionGhost href={admin.auditShortcuts.authHref}>Auth history</ActionGhost>
        </div>
      }
      surface="primary"
    >
      <p className="muted">
        Operator detail surface for lifecycle, access profile, audit history and schema-backed permission controls.
      </p>
      <div className="pillRow">
        <span className="pill">{admin.core.status}</span>
        <span className="pill">{admin.accessProfile.resolvedRole ?? admin.core.role ?? admin.core.type}</span>
        <span className="pill">{admin.core.type}</span>
      </div>
    </Panel>
  );
}
