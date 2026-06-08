import {
  ADMIN_V2_MAX_COUNT_GT_VALUE,
  ADMIN_V2_MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES,
  ADMIN_V2_MIN_COUNT_GT_VALUE,
  ADMIN_V2_MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES,
} from '@remoola/api-types';

import {
  AlertQueryFields,
  AlertStateBadges,
  describeQueryPayload,
  formatThreshold,
  getCountThresholdValue,
} from './operational-alerts-shared';
import { ActionGhost } from '../../components/action-ghost';
import { Panel } from '../../components/panel';
import {
  dangerButtonClass,
  detailsSummaryClass,
  fieldClass,
  fieldLabelClass,
  monoMutedTextClass,
  mutedTextClass,
  stackClass,
  textInputClass,
} from '../../components/ui-classes';
import { type OperationalAlertSummary } from '../../lib/admin-api/types';
import { formatDateTime } from '../../lib/admin-format';
import {
  deleteOperationalAlertAction,
  updateOperationalAlertAction,
} from '../../lib/admin-mutations/operational-alerts.server';
import { SHARED_DESCRIPTION_MAX_LENGTH, SHARED_NAME_MAX_LENGTH } from '../../lib/admin-surface-meta';

export function AlertRow({ alert, now }: { alert: OperationalAlertSummary; now: Date }) {
  return (
    <Panel actions={<AlertStateBadges alert={alert} now={now} />}>
      <div>
        <strong>{alert.name}</strong>
        {alert.description ? <p className={mutedTextClass}>{alert.description}</p> : null}
        <p className={monoMutedTextClass}>{describeQueryPayload(alert.workspace, alert.queryPayload)}</p>
        <p className={mutedTextClass}>
          Threshold: {formatThreshold(alert.thresholdPayload)} - every {alert.evaluationIntervalMinutes} min
        </p>
        <p className={mutedTextClass}>Last evaluated: {formatDateTime(alert.lastEvaluatedAt)}</p>
        {alert.lastFireReason ? <p className={mutedTextClass}>Last fire reason: {alert.lastFireReason}</p> : null}
        {alert.lastEvaluationError ? (
          <p className={mutedTextClass}>Evaluation error detail: {alert.lastEvaluationError}</p>
        ) : null}
      </div>
      <div className="actionsRow">
        <form action={deleteOperationalAlertAction.bind(null, alert.id)}>
          <input type="hidden" name="workspace" value={alert.workspace} />
          <button className={dangerButtonClass} type="submit">
            Delete
          </button>
        </form>
      </div>
      <details>
        <summary className={detailsSummaryClass}>Rename or update threshold</summary>
        <form action={updateOperationalAlertAction.bind(null, alert.id)} className={stackClass}>
          <input type="hidden" name="workspace" value={alert.workspace} />
          <label className={fieldClass}>
            <span className={fieldLabelClass}>Name</span>
            <input
              className={textInputClass}
              name="name"
              defaultValue={alert.name}
              required
              maxLength={SHARED_NAME_MAX_LENGTH}
              aria-label="Operational alert name"
            />
          </label>
          <label className={fieldClass}>
            <span className={fieldLabelClass}>Description</span>
            <input
              className={textInputClass}
              name="description"
              defaultValue={alert.description ?? ``}
              maxLength={SHARED_DESCRIPTION_MAX_LENGTH}
              aria-label="Operational alert description"
            />
          </label>
          <AlertQueryFields workspace={alert.workspace} raw={alert.queryPayload} />
          <label className={fieldClass}>
            <span className={fieldLabelClass}>Threshold count</span>
            <input
              className={textInputClass}
              name="countThreshold"
              type="number"
              defaultValue={getCountThresholdValue(alert.thresholdPayload)}
              min={ADMIN_V2_MIN_COUNT_GT_VALUE}
              max={ADMIN_V2_MAX_COUNT_GT_VALUE}
              required
              aria-label="Operational alert threshold count"
            />
          </label>
          <label className={fieldClass}>
            <span className={fieldLabelClass}>Evaluation interval (minutes)</span>
            <input
              className={textInputClass}
              name="evaluationIntervalMinutes"
              type="number"
              defaultValue={alert.evaluationIntervalMinutes}
              min={ADMIN_V2_MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES}
              max={ADMIN_V2_MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES}
              aria-label="Operational alert evaluation interval"
            />
          </label>
          <ActionGhost type="submit">Save changes</ActionGhost>
        </form>
      </details>
    </Panel>
  );
}
