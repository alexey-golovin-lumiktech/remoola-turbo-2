import { AlertRow } from './operational-alerts-alert-row';
import {
  CreateAuthRefreshReuseAlertForm,
  CreateLedgerAnomaliesAlertForm,
  CreateVerificationQueueAlertForm,
} from './operational-alerts-create-forms';
import { type WorkspaceResponse } from './operational-alerts-shared';
import { Panel } from '../../components/panel';
import { mutedTextClass, stackClass } from '../../components/ui-classes';
import { type OperationalAlertWorkspace } from '../../lib/admin-api/types';
import { OPERATIONAL_ALERT_WORKSPACE_META } from '../../lib/admin-surface-meta';

export function OperationalAlertWorkspaceSection({
  workspace,
  response,
  now,
}: {
  workspace: OperationalAlertWorkspace;
  response: WorkspaceResponse;
  now: Date;
}) {
  const alerts = response?.alerts ?? [];
  const meta = OPERATIONAL_ALERT_WORKSPACE_META[workspace];

  return (
    <Panel title={meta.sectionTitle} description={meta.sectionCaption}>
      <p className={mutedTextClass}>{alerts.length} alert(s)</p>
      <div className={stackClass}>
        {response === null ? (
          <p className={mutedTextClass}>
            Operational alerts list is temporarily unavailable from the backend. Try again later.
          </p>
        ) : alerts.length === 0 ? (
          <p className={mutedTextClass}>No alerts yet for this workspace.</p>
        ) : (
          alerts.map((alert) => <AlertRow key={alert.id} alert={alert} now={now} />)
        )}
      </div>
      {workspace === `ledger_anomalies` ? <CreateLedgerAnomaliesAlertForm /> : null}
      {workspace === `auth_refresh_reuse` ? <CreateAuthRefreshReuseAlertForm /> : null}
      {workspace === `verification_queue` ? <CreateVerificationQueueAlertForm /> : null}
    </Panel>
  );
}
