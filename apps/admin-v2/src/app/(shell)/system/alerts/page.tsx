import {
  getOperationalAlerts,
  type OperationalAlertSummary,
  type OperationalAlertThreshold,
  type OperationalAlertWorkspace,
} from '../../../../lib/admin-api.server';
import {
  createOperationalAlertAction,
  deleteOperationalAlertAction,
  updateOperationalAlertAction,
} from '../../../../lib/admin-mutations.server';

const OPERATIONAL_ALERT_WORKSPACE: OperationalAlertWorkspace = `ledger_anomalies`;

const MAX_OPERATIONAL_ALERT_NAME_LENGTH = 100;
const MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH = 500;
const MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES = 1;
const MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES = 1440;
const DEFAULT_OPERATIONAL_ALERT_INTERVAL_MINUTES = 5;
const MIN_COUNT_GT_VALUE = 1;
const MAX_COUNT_GT_VALUE = 1_000_000;

const LEDGER_ANOMALY_CLASS_OPTIONS = [
  { value: `stalePendingEntries`, label: `Stale pending entries` },
  { value: `inconsistentOutcomeChains`, label: `Inconsistent outcome chains` },
  { value: `largeValueOutliers`, label: `Large value outliers` },
  { value: `orphanedEntries`, label: `Orphaned entries` },
  { value: `duplicateIdempotencyRisk`, label: `Duplicate idempotency risk` },
  { value: `impossibleTransitions`, label: `Impossible transitions` },
] as const;

type LedgerAnomalyClassValue = (typeof LEDGER_ANOMALY_CLASS_OPTIONS)[number][`value`];

function isLedgerAnomalyClass(value: unknown): value is LedgerAnomalyClassValue {
  return typeof value === `string` && LEDGER_ANOMALY_CLASS_OPTIONS.some((option) => option.value === value);
}

type LedgerAnomaliesAlertQueryPayload = {
  class: LedgerAnomalyClassValue;
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

function formatThreshold(threshold: OperationalAlertThreshold): string {
  if (threshold.type === `count_gt`) {
    return `count > ${threshold.value}`;
  }
  return `Unsupported threshold`;
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) {
    return `-`;
  }
  return new Date(value).toLocaleString();
}

function isCurrentlyFiring(alert: OperationalAlertSummary, now: Date): boolean {
  if (!alert.lastFiredAt) return false;
  const firedAt = new Date(alert.lastFiredAt).getTime();
  if (Number.isNaN(firedAt)) return false;
  const windowMs = alert.evaluationIntervalMinutes * 2 * 60 * 1000;
  return now.getTime() - firedAt <= windowMs;
}

function AlertStateBadges({ alert, now }: { alert: OperationalAlertSummary; now: Date }) {
  const firing = isCurrentlyFiring(alert, now);
  return (
    <div className="actionsRow" aria-label="Alert state">
      {firing ? (
        <span className="badge badgeDanger" title={alert.lastFireReason ?? undefined}>
          FIRED
        </span>
      ) : alert.lastFiredAt ? (
        <span className="muted" title={alert.lastFireReason ?? undefined}>
          Last fired: {formatTimestamp(alert.lastFiredAt)}
        </span>
      ) : (
        <span className="muted">Never fired</span>
      )}
      {alert.lastEvaluationError ? (
        <span className="badge badgeWarning" title={alert.lastEvaluationError}>
          Evaluation error
        </span>
      ) : null}
    </div>
  );
}

function AlertRow({ alert, now }: { alert: OperationalAlertSummary; now: Date }) {
  const queryPayload = parseLedgerAnomaliesAlertQuery(alert.queryPayload);
  const queryPayloadJson = JSON.stringify(alert.queryPayload ?? null);
  const thresholdJson = JSON.stringify(alert.thresholdPayload);

  return (
    <article className="panel" aria-label={`Operational alert ${alert.name}`}>
      <div className="pageHeader">
        <div>
          <strong>{alert.name}</strong>
          {alert.description ? <p className="muted">{alert.description}</p> : null}
          <p className="muted mono">
            Class: {queryPayload?.class ?? `unknown`}
            {queryPayload?.dateFrom ? `, dateFrom=${queryPayload.dateFrom}` : ``}
            {queryPayload?.dateTo ? `, dateTo=${queryPayload.dateTo}` : ``}
          </p>
          <p className="muted">
            Threshold: {formatThreshold(alert.thresholdPayload)} - every {alert.evaluationIntervalMinutes} min
          </p>
          <p className="muted">Last evaluated: {formatTimestamp(alert.lastEvaluatedAt)}</p>
        </div>
        <div>
          <AlertStateBadges alert={alert} now={now} />
        </div>
      </div>
      <div className="actionsRow">
        <form action={deleteOperationalAlertAction.bind(null, alert.id)}>
          <input type="hidden" name="workspace" value={alert.workspace} />
          <button className="dangerButton" type="submit">
            Delete
          </button>
        </form>
      </div>
      <details>
        <summary className="muted">Rename or update threshold</summary>
        <form action={updateOperationalAlertAction.bind(null, alert.id)} className="formStack">
          <input type="hidden" name="queryPayload" value={queryPayloadJson} />
          <label className="field">
            <span>Name</span>
            <input
              name="name"
              defaultValue={alert.name}
              required
              maxLength={MAX_OPERATIONAL_ALERT_NAME_LENGTH}
              aria-label="Operational alert name"
            />
          </label>
          <label className="field">
            <span>Description</span>
            <input
              name="description"
              defaultValue={alert.description ?? ``}
              maxLength={MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH}
              aria-label="Operational alert description"
            />
          </label>
          <label className="field">
            <span>Threshold (count_gt value)</span>
            <input
              name="thresholdPayload"
              type="text"
              defaultValue={thresholdJson}
              required
              aria-label="Operational alert threshold payload JSON"
            />
            <span className="muted">
              JSON shape: {`{ "type": "count_gt", "value": <integer ${MIN_COUNT_GT_VALUE}-${MAX_COUNT_GT_VALUE}> }`}
            </span>
          </label>
          <label className="field">
            <span>Evaluation interval (minutes)</span>
            <input
              name="evaluationIntervalMinutes"
              type="number"
              defaultValue={alert.evaluationIntervalMinutes}
              min={MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES}
              max={MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES}
              aria-label="Operational alert evaluation interval"
            />
          </label>
          <button className="secondaryButton" type="submit">
            Save changes
          </button>
        </form>
      </details>
    </article>
  );
}

function CreateAlertForm() {
  const defaultQueryPayload: LedgerAnomaliesAlertQueryPayload = { class: `stalePendingEntries` };
  const defaultThresholdPayload = { type: `count_gt`, value: 5 };
  return (
    <article className="panel">
      <h3>New alert</h3>
      <p className="muted">
        Backend treats queryPayload as opaque (workspace handler owns the schema) and parses thresholdPayload
        structurally. In this skeleton only count_gt is supported.
      </p>
      <form action={createOperationalAlertAction} className="formStack">
        <input type="hidden" name="workspace" value={OPERATIONAL_ALERT_WORKSPACE} />
        <label className="field">
          <span>Name</span>
          <input
            name="name"
            required
            maxLength={MAX_OPERATIONAL_ALERT_NAME_LENGTH}
            placeholder="e.g. Stale pending entries spike"
            aria-label="New operational alert name"
          />
        </label>
        <label className="field">
          <span>Description</span>
          <input
            name="description"
            maxLength={MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH}
            placeholder="Optional"
            aria-label="New operational alert description"
          />
        </label>
        <label className="field">
          <span>Query payload (anomaly class)</span>
          <input
            name="queryPayload"
            type="text"
            defaultValue={JSON.stringify(defaultQueryPayload)}
            required
            aria-label="New operational alert query payload"
          />
          <span className="muted">
            JSON shape:{` `}
            {`{ "class": "<one of: ${LEDGER_ANOMALY_CLASS_OPTIONS.map((o) => o.value).join(`|`)}>", "dateFrom"?: "YYYY-MM-DD", "dateTo"?: "YYYY-MM-DD" }`}
          </span>
        </label>
        <label className="field">
          <span>Threshold payload</span>
          <input
            name="thresholdPayload"
            type="text"
            defaultValue={JSON.stringify(defaultThresholdPayload)}
            required
            aria-label="New operational alert threshold payload"
          />
          <span className="muted">
            JSON shape: {`{ "type": "count_gt", "value": <integer ${MIN_COUNT_GT_VALUE}-${MAX_COUNT_GT_VALUE}> }`}
          </span>
        </label>
        <label className="field">
          <span>Evaluation interval (minutes)</span>
          <input
            name="evaluationIntervalMinutes"
            type="number"
            defaultValue={DEFAULT_OPERATIONAL_ALERT_INTERVAL_MINUTES}
            min={MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES}
            max={MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES}
            aria-label="New operational alert evaluation interval"
          />
        </label>
        <button className="primaryButton" type="submit">
          Create alert
        </button>
      </form>
    </article>
  );
}

export default async function OperationalAlertsPage() {
  const response = await getOperationalAlerts({ workspace: OPERATIONAL_ALERT_WORKSPACE });
  const alerts = response?.alerts ?? [];
  const now = new Date();

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Operational alerts</h1>
          <p className="muted">
            Personal alerts on the ledger anomalies workspace. Backend evaluates every 5 minutes; in-app fired-state
            badge only.
          </p>
        </div>
      </section>

      <section className="panel" aria-label="Operational alerts list">
        <div className="pageHeader">
          <div>
            <h2>Your alerts</h2>
            <p className="muted">{alerts.length} alert(s)</p>
          </div>
        </div>
        <div className="formStack">
          {response === null ? (
            <p className="muted">
              Operational alerts list is temporarily unavailable from the backend. Try again later.
            </p>
          ) : alerts.length === 0 ? (
            <p className="muted">No alerts yet. Create one to be notified when anomaly counts exceed your threshold.</p>
          ) : (
            alerts.map((alert) => <AlertRow key={alert.id} alert={alert} now={now} />)
          )}
        </div>
        <CreateAlertForm />
      </section>
    </>
  );
}
