import {
  ADMIN_V2_DEFAULT_AUTH_REFRESH_REUSE_WINDOW_MINUTES,
  ADMIN_V2_DEFAULT_OPERATIONAL_ALERT_INTERVAL_MINUTES,
  ADMIN_V2_MAX_AUTH_REFRESH_REUSE_WINDOW_MINUTES,
  ADMIN_V2_MAX_COUNT_GT_VALUE,
  ADMIN_V2_MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES,
  ADMIN_V2_MIN_AUTH_REFRESH_REUSE_WINDOW_MINUTES,
  ADMIN_V2_MIN_COUNT_GT_VALUE,
  ADMIN_V2_MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES,
} from '@remoola/api-types';

import { ActionPrimary } from '../../components/action-primary';
import { Panel } from '../../components/panel';
import { fieldClass, fieldLabelClass, mutedTextClass, stackClass, textInputClass } from '../../components/ui-classes';
import { createOperationalAlertAction } from '../../lib/admin-mutations/operational-alerts.server';
import {
  LEDGER_ANOMALY_CLASS_LABELS,
  LEDGER_ANOMALY_CLASS_ORDER,
  OPERATIONAL_ALERT_WORKSPACE_META,
  SHARED_DESCRIPTION_MAX_LENGTH,
  SHARED_NAME_MAX_LENGTH,
} from '../../lib/admin-surface-meta';

export function CreateLedgerAnomaliesAlertForm() {
  const meta = OPERATIONAL_ALERT_WORKSPACE_META.ledger_anomalies;
  return (
    <Panel title={meta.createTitle}>
      <p className={mutedTextClass}>
        Monitor a specific anomaly class, with optional date bounds and a count threshold.
      </p>
      <form action={createOperationalAlertAction} className={stackClass}>
        <input type="hidden" name="workspace" value="ledger_anomalies" />
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Name</span>
          <input
            className={textInputClass}
            name="name"
            required
            maxLength={SHARED_NAME_MAX_LENGTH}
            placeholder={meta.namePlaceholder}
            aria-label="New ledger anomalies alert name"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Description</span>
          <input
            className={textInputClass}
            name="description"
            maxLength={SHARED_DESCRIPTION_MAX_LENGTH}
            placeholder="Optional"
            aria-label="New ledger anomalies alert description"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Anomaly class</span>
          <select
            className={textInputClass}
            name="anomalyClass"
            defaultValue="stalePendingEntries"
            aria-label="New anomaly class"
          >
            {LEDGER_ANOMALY_CLASS_ORDER.map((item) => (
              <option key={item} value={item}>
                {LEDGER_ANOMALY_CLASS_LABELS[item]}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Date from</span>
          <input
            className={textInputClass}
            name="dateFrom"
            type="date"
            aria-label="New ledger anomalies alert date from"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Date to</span>
          <input className={textInputClass} name="dateTo" type="date" aria-label="New ledger anomalies alert date to" />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Threshold count</span>
          <input
            className={textInputClass}
            name="countThreshold"
            type="number"
            defaultValue={5}
            min={ADMIN_V2_MIN_COUNT_GT_VALUE}
            max={ADMIN_V2_MAX_COUNT_GT_VALUE}
            aria-label="New ledger anomalies alert threshold count"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Evaluation interval (minutes)</span>
          <input
            className={textInputClass}
            name="evaluationIntervalMinutes"
            type="number"
            defaultValue={ADMIN_V2_DEFAULT_OPERATIONAL_ALERT_INTERVAL_MINUTES}
            min={ADMIN_V2_MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES}
            max={ADMIN_V2_MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES}
            aria-label="New ledger anomalies alert evaluation interval"
          />
        </label>
        <ActionPrimary type="submit">Create alert</ActionPrimary>
      </form>
    </Panel>
  );
}

export function CreateAuthRefreshReuseAlertForm() {
  const meta = OPERATIONAL_ALERT_WORKSPACE_META.auth_refresh_reuse;
  return (
    <Panel title={meta.createTitle}>
      <p className={mutedTextClass}>
        Fires when admin refresh-token reuse events exceed the threshold within the rolling window. Window range: [
        {ADMIN_V2_MIN_AUTH_REFRESH_REUSE_WINDOW_MINUTES}..{ADMIN_V2_MAX_AUTH_REFRESH_REUSE_WINDOW_MINUTES}] minutes.
      </p>
      <form action={createOperationalAlertAction} className={stackClass}>
        <input type="hidden" name="workspace" value="auth_refresh_reuse" />
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Name</span>
          <input
            className={textInputClass}
            name="name"
            required
            maxLength={SHARED_NAME_MAX_LENGTH}
            placeholder={meta.namePlaceholder}
            aria-label="New auth refresh reuse alert name"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Description</span>
          <input
            className={textInputClass}
            name="description"
            maxLength={SHARED_DESCRIPTION_MAX_LENGTH}
            placeholder="Optional"
            aria-label="New auth refresh reuse alert description"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Rolling window (minutes)</span>
          <input
            className={textInputClass}
            name="windowMinutes"
            type="number"
            defaultValue={ADMIN_V2_DEFAULT_AUTH_REFRESH_REUSE_WINDOW_MINUTES}
            required
            min={ADMIN_V2_MIN_AUTH_REFRESH_REUSE_WINDOW_MINUTES}
            max={ADMIN_V2_MAX_AUTH_REFRESH_REUSE_WINDOW_MINUTES}
            aria-label="New auth refresh reuse alert window"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Threshold count</span>
          <input
            className={textInputClass}
            name="countThreshold"
            type="number"
            defaultValue={1}
            required
            min={ADMIN_V2_MIN_COUNT_GT_VALUE}
            max={ADMIN_V2_MAX_COUNT_GT_VALUE}
            aria-label="New auth refresh reuse alert threshold count"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Evaluation interval (minutes)</span>
          <input
            className={textInputClass}
            name="evaluationIntervalMinutes"
            type="number"
            defaultValue={ADMIN_V2_DEFAULT_OPERATIONAL_ALERT_INTERVAL_MINUTES}
            min={ADMIN_V2_MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES}
            max={ADMIN_V2_MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES}
            aria-label="New auth refresh reuse alert evaluation interval"
          />
        </label>
        <ActionPrimary type="submit">Create alert</ActionPrimary>
      </form>
    </Panel>
  );
}

export function CreateVerificationQueueAlertForm() {
  const meta = OPERATIONAL_ALERT_WORKSPACE_META.verification_queue;
  return (
    <Panel title={meta.createTitle}>
      <p className={mutedTextClass}>
        Fires when the verification queue size (filtered by the optional accept-list keys below) exceeds the threshold.
        An empty payload (<code>{`{}`}</code>) monitors the total queue.
      </p>
      <form action={createOperationalAlertAction} className={stackClass}>
        <input type="hidden" name="workspace" value="verification_queue" />
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Name</span>
          <input
            className={textInputClass}
            name="name"
            required
            maxLength={SHARED_NAME_MAX_LENGTH}
            placeholder={meta.namePlaceholder}
            aria-label="New verification queue alert name"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Description</span>
          <input
            className={textInputClass}
            name="description"
            maxLength={SHARED_DESCRIPTION_MAX_LENGTH}
            placeholder="Optional"
            aria-label="New verification queue alert description"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Verification status</span>
          <input
            className={textInputClass}
            name="status"
            placeholder="status"
            aria-label="New verification queue alert status"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Stripe status</span>
          <input
            className={textInputClass}
            name="stripeIdentityStatus"
            placeholder="stripe status"
            aria-label="New verification queue alert stripe status"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Country</span>
          <input
            className={textInputClass}
            name="country"
            aria-label="New verification queue alert country"
            placeholder="country"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Contractor kind</span>
          <input
            className={textInputClass}
            name="contractorKind"
            aria-label="New verification queue alert contractor kind"
            placeholder="contractor kind"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <label className={fieldClass}>
            <span className={fieldLabelClass}>Profile completeness</span>
            <input type="checkbox" name="missingProfileData" value="true" aria-label="New alert missing profile only" />
          </label>
          <label className={fieldClass}>
            <span className={fieldLabelClass}>Document completeness</span>
            <input type="checkbox" name="missingDocuments" value="true" aria-label="New alert missing documents only" />
          </label>
        </div>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Threshold count</span>
          <input
            className={textInputClass}
            name="countThreshold"
            type="number"
            defaultValue={25}
            min={ADMIN_V2_MIN_COUNT_GT_VALUE}
            max={ADMIN_V2_MAX_COUNT_GT_VALUE}
            aria-label="New verification queue alert threshold count"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Evaluation interval (minutes)</span>
          <input
            className={textInputClass}
            name="evaluationIntervalMinutes"
            type="number"
            defaultValue={ADMIN_V2_DEFAULT_OPERATIONAL_ALERT_INTERVAL_MINUTES}
            min={ADMIN_V2_MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES}
            max={ADMIN_V2_MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES}
            aria-label="New verification queue alert evaluation interval"
          />
        </label>
        <ActionPrimary type="submit">Create alert</ActionPrimary>
      </form>
    </Panel>
  );
}
