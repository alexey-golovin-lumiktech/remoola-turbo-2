import {
  ADMIN_V2_DEFAULT_AUTH_REFRESH_REUSE_WINDOW_MINUTES,
  ADMIN_V2_MAX_AUTH_REFRESH_REUSE_WINDOW_MINUTES,
  ADMIN_V2_MIN_AUTH_REFRESH_REUSE_WINDOW_MINUTES,
  ADMIN_V2_DEFAULT_OPERATIONAL_ALERT_INTERVAL_MINUTES,
  ADMIN_V2_MAX_COUNT_GT_VALUE,
  ADMIN_V2_MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES,
  ADMIN_V2_MIN_COUNT_GT_VALUE,
  ADMIN_V2_MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES,
} from '@remoola/api-types';

import { ActionGhost } from '../../components/action-ghost';
import { ActionPrimary } from '../../components/action-primary';
import { Panel } from '../../components/panel';
import { TinyPill } from '../../components/tiny-pill';
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
import { type getOperationalAlerts } from '../../lib/admin-api/overview.server';
import {
  type LedgerAnomalyClass,
  type OperationalAlertSummary,
  type OperationalAlertThreshold,
  type OperationalAlertWorkspace,
} from '../../lib/admin-api/types';
import { formatDateTime } from '../../lib/admin-format';
import {
  createOperationalAlertAction,
  deleteOperationalAlertAction,
  updateOperationalAlertAction,
} from '../../lib/admin-mutations/operational-alerts.server';
import {
  isLedgerAnomalyClass,
  LEDGER_ANOMALY_CLASS_LABELS,
  LEDGER_ANOMALY_CLASS_ORDER,
  OPERATIONAL_ALERT_WORKSPACE_META,
  SHARED_DESCRIPTION_MAX_LENGTH,
  SHARED_NAME_MAX_LENGTH,
} from '../../lib/admin-surface-meta';
import {
  describeVerificationQueuePayload,
  parseAuthRefreshReuseAlertQueryPayload,
  parseVerificationQueuePayload,
} from '../../lib/admin-surface-payloads';

type WorkspaceResponse = Awaited<ReturnType<typeof getOperationalAlerts>>;

type LedgerAnomaliesAlertQueryPayload = {
  class: LedgerAnomalyClass;
  dateFrom?: string;
  dateTo?: string;
};

function parseLedgerAnomaliesAlertQuery(raw: unknown): LedgerAnomaliesAlertQueryPayload | null {
  if (raw === null || typeof raw !== `object` || Array.isArray(raw)) {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  if (!isLedgerAnomalyClass(candidate.class)) {
    return null;
  }
  return {
    class: candidate.class,
    dateFrom: typeof candidate.dateFrom === `string` ? candidate.dateFrom : undefined,
    dateTo: typeof candidate.dateTo === `string` ? candidate.dateTo : undefined,
  };
}

function getCountThresholdValue(threshold: OperationalAlertThreshold): number {
  return threshold.type === `count_gt` ? threshold.value : ADMIN_V2_MIN_COUNT_GT_VALUE;
}

function formatThreshold(threshold: OperationalAlertThreshold): string {
  if (threshold.type === `count_gt`) {
    return `count > ${threshold.value}`;
  }
  return `Unsupported threshold`;
}

function formatTimestamp(value: string | null | undefined) {
  return formatDateTime(value);
}

function isCurrentlyFiring(alert: OperationalAlertSummary, now: Date): boolean {
  if (!alert.lastFiredAt) return false;
  const firedAt = new Date(alert.lastFiredAt).getTime();
  if (Number.isNaN(firedAt)) return false;
  const windowMs = alert.evaluationIntervalMinutes * 2 * 60 * 1000;
  return now.getTime() - firedAt <= windowMs;
}

function describeQueryPayload(workspace: OperationalAlertWorkspace, raw: unknown): string {
  if (workspace === `ledger_anomalies`) {
    const parsed = parseLedgerAnomaliesAlertQuery(raw);
    if (!parsed) return `Class: unknown`;
    const label = LEDGER_ANOMALY_CLASS_LABELS[parsed.class];
    const tail = [
      parsed.dateFrom ? `dateFrom=${parsed.dateFrom}` : null,
      parsed.dateTo ? `dateTo=${parsed.dateTo}` : null,
    ]
      .filter(Boolean)
      .join(`, `);
    return tail ? `Class: ${label}, ${tail}` : `Class: ${label}`;
  }
  if (workspace === `auth_refresh_reuse`) {
    const parsed = parseAuthRefreshReuseAlertQueryPayload(raw);
    return parsed ? `Window: ${parsed.windowMinutes}m` : `Window: unknown`;
  }
  const parsed = parseVerificationQueuePayload(raw);
  return parsed ? describeVerificationQueuePayload(parsed) : `Filters: invalid payload`;
}

function AlertStateBadges({ alert, now }: { alert: OperationalAlertSummary; now: Date }) {
  const firing = isCurrentlyFiring(alert, now);
  return (
    <div className="actionsRow" aria-label="Alert state">
      {firing ? (
        <TinyPill tone="rose" className="min-h-0">
          FIRED
        </TinyPill>
      ) : alert.lastFiredAt ? (
        <span className={mutedTextClass} title={alert.lastFireReason ?? undefined}>
          Last fired: {formatTimestamp(alert.lastFiredAt)}
        </span>
      ) : (
        <span className={mutedTextClass}>Never fired</span>
      )}
      {alert.lastEvaluationError ? (
        <TinyPill tone="amber" className="min-h-0">
          Evaluation error
        </TinyPill>
      ) : null}
    </div>
  );
}

function LedgerAnomaliesQueryFields({ raw }: { raw: unknown }) {
  const parsed = parseLedgerAnomaliesAlertQuery(raw) ?? { class: `stalePendingEntries` as const };
  return (
    <>
      <label className={fieldClass}>
        <span className={fieldLabelClass}>Anomaly class</span>
        <select
          className={textInputClass}
          name="anomalyClass"
          defaultValue={parsed.class}
          aria-label="Alert anomaly class"
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
          defaultValue={parsed.dateFrom ?? ``}
          aria-label="Alert anomaly date from"
        />
      </label>
      <label className={fieldClass}>
        <span className={fieldLabelClass}>Date to</span>
        <input
          className={textInputClass}
          name="dateTo"
          type="date"
          defaultValue={parsed.dateTo ?? ``}
          aria-label="Alert anomaly date to"
        />
      </label>
    </>
  );
}

function AuthRefreshReuseQueryFields({ raw }: { raw: unknown }) {
  const parsed = parseAuthRefreshReuseAlertQueryPayload(raw) ?? {
    windowMinutes: ADMIN_V2_DEFAULT_AUTH_REFRESH_REUSE_WINDOW_MINUTES,
  };
  return (
    <label className={fieldClass}>
      <span className={fieldLabelClass}>Rolling window (minutes)</span>
      <input
        className={textInputClass}
        name="windowMinutes"
        type="number"
        defaultValue={parsed.windowMinutes}
        min={ADMIN_V2_MIN_AUTH_REFRESH_REUSE_WINDOW_MINUTES}
        max={ADMIN_V2_MAX_AUTH_REFRESH_REUSE_WINDOW_MINUTES}
        aria-label="Alert refresh reuse window"
      />
    </label>
  );
}

function VerificationQueueQueryFields({ raw }: { raw: unknown }) {
  const parsed = parseVerificationQueuePayload(raw) ?? {};
  return (
    <>
      <label className={fieldClass}>
        <span className={fieldLabelClass}>Verification status</span>
        <input
          className={textInputClass}
          name="status"
          defaultValue={parsed.status ?? ``}
          placeholder="status"
          aria-label="Alert verification status"
        />
      </label>
      <label className={fieldClass}>
        <span className={fieldLabelClass}>Stripe status</span>
        <input
          className={textInputClass}
          name="stripeIdentityStatus"
          defaultValue={parsed.stripeIdentityStatus ?? ``}
          placeholder="stripe status"
          aria-label="Alert stripe status"
        />
      </label>
      <label className={fieldClass}>
        <span className={fieldLabelClass}>Country</span>
        <input
          className={textInputClass}
          name="country"
          defaultValue={parsed.country ?? ``}
          placeholder="country"
          aria-label="Alert verification country"
        />
      </label>
      <label className={fieldClass}>
        <span className={fieldLabelClass}>Contractor kind</span>
        <input
          className={textInputClass}
          name="contractorKind"
          defaultValue={parsed.contractorKind ?? ``}
          placeholder="contractor kind"
          aria-label="Alert contractor kind"
        />
      </label>
      <div className="flex flex-col justify-end gap-3 md:col-span-2">
        <div className="flex flex-wrap gap-3">
          <label className={fieldClass}>
            <span className={fieldLabelClass}>Profile completeness</span>
            <input
              type="checkbox"
              name="missingProfileData"
              value="true"
              defaultChecked={parsed.missingProfileData === true}
              aria-label="Alert missing profile data only"
            />
          </label>
          <label className={fieldClass}>
            <span className={fieldLabelClass}>Document completeness</span>
            <input
              type="checkbox"
              name="missingDocuments"
              value="true"
              defaultChecked={parsed.missingDocuments === true}
              aria-label="Alert missing documents only"
            />
          </label>
        </div>
      </div>
    </>
  );
}

function AlertQueryFields({ workspace, raw }: { workspace: OperationalAlertWorkspace; raw: unknown }) {
  if (workspace === `ledger_anomalies`) {
    return <LedgerAnomaliesQueryFields raw={raw} />;
  }
  if (workspace === `auth_refresh_reuse`) {
    return <AuthRefreshReuseQueryFields raw={raw} />;
  }
  return <VerificationQueueQueryFields raw={raw} />;
}

function AlertRow({ alert, now }: { alert: OperationalAlertSummary; now: Date }) {
  return (
    <Panel actions={<AlertStateBadges alert={alert} now={now} />}>
      <div>
        <strong>{alert.name}</strong>
        {alert.description ? <p className={mutedTextClass}>{alert.description}</p> : null}
        <p className={monoMutedTextClass}>{describeQueryPayload(alert.workspace, alert.queryPayload)}</p>
        <p className={mutedTextClass}>
          Threshold: {formatThreshold(alert.thresholdPayload)} - every {alert.evaluationIntervalMinutes} min
        </p>
        <p className={mutedTextClass}>Last evaluated: {formatTimestamp(alert.lastEvaluatedAt)}</p>
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

function CreateLedgerAnomaliesAlertForm() {
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

function CreateAuthRefreshReuseAlertForm() {
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

function CreateVerificationQueueAlertForm() {
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
