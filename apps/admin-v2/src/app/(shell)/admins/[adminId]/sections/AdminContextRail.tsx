import { ActionGhost } from '../../../../../components/action-ghost';
import { ContextStat } from '../../../../../components/context-stat';
import { EMPTY_VALUE } from '../../../../../lib/admin-format';
import { type AdminCasePageData } from '../page.loader';

export function AdminContextRail({
  admin,
  sessions,
  backToQueueHref,
}: {
  admin: AdminCasePageData[`admin`];
  sessions: AdminCasePageData[`sessions`];
  backToQueueHref: string;
}) {
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <ContextStat
          label="Status"
          value={admin.core.status}
          tone={admin.core.status === `ACTIVE` ? `emerald` : `rose`}
        />
        <ContextStat
          label="Resolved role"
          value={admin.accessProfile.resolvedRole ?? admin.core.role ?? EMPTY_VALUE}
          tone="cyan"
        />
        <ContextStat label="Capability count" value={admin.accessProfile.capabilities.length} />
        <ContextStat label="Visible sessions" value={sessions.length} />
      </div>
      <div className="contextRailSection">
        <h4>Quick links</h4>
        <div className="contextRailLinks">
          <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
          <ActionGhost href={admin.auditShortcuts.adminActionsHref}>Related admin actions</ActionGhost>
          <ActionGhost href={admin.auditShortcuts.authHref}>Auth history</ActionGhost>
        </div>
      </div>
    </>
  );
}
