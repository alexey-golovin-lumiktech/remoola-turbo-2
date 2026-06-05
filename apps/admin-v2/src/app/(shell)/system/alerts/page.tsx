import { AdminSurfaceAccessDenied } from '../../../../components/admin-surface-state';
import { Panel } from '../../../../components/panel';
import { TinyPill } from '../../../../components/tiny-pill';
import { mutedTextClass } from '../../../../components/ui-classes';
import { WorkspaceLayout } from '../../../../components/workspace-layout';
import { OperationalAlertWorkspaceSection } from '../../../../features/system/operational-alerts-presenters';
import { getAdminIdentity } from '../../../../lib/admin-api/identity.server';
import { getOperationalAlerts } from '../../../../lib/admin-api/overview.server';
import { ADMIN_CAPABILITIES, hasAdminCapability } from '../../../../lib/admin-capabilities';
import { OPERATIONAL_ALERT_WORKSPACE_ORDER } from '../../../../lib/admin-surface-meta';

export default async function OperationalAlertsPage() {
  const identity = await getAdminIdentity();
  const canManageAlerts = hasAdminCapability(identity, ADMIN_CAPABILITIES.alertsManage);
  if (!canManageAlerts) {
    return (
      <AdminSurfaceAccessDenied
        title="Operational alerts unavailable"
        description="Your admin identity can sign in, but it cannot manage operational alerts."
      />
    );
  }

  const workspaceResponses = await Promise.all(
    OPERATIONAL_ALERT_WORKSPACE_ORDER.map(async (workspace) => ({
      workspace,
      response: await getOperationalAlerts({ workspace }),
    })),
  );
  const now = new Date();

  return (
    <WorkspaceLayout workspace="system-alerts">
      <>
        <Panel
          title="Operational alerts"
          description="Personal alerts for supported workspaces. Saved-view-compatible workspaces share the same query model here; auth refresh reuse stays alert-only. Checked every 5 minutes; badges update in app only."
          actions={<TinyPill tone="cyan">{workspaceResponses.length} workspaces</TinyPill>}
          surface="primary"
        >
          <p className={mutedTextClass}>
            Manage operator-specific alert thresholds without changing queue logic or saved-view behavior.
          </p>
        </Panel>

        {workspaceResponses.map(({ workspace, response }) => (
          <OperationalAlertWorkspaceSection key={workspace} workspace={workspace} response={response} now={now} />
        ))}
      </>
    </WorkspaceLayout>
  );
}
