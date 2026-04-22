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

const MAX_OPERATIONAL_ALERT_NAME_LENGTH = 100;
const MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH = 500;
const MIN_OPERATIONAL_ALERT_INTERVAL_MINUTES = 1;
const MAX_OPERATIONAL_ALERT_INTERVAL_MINUTES = 1440;
const DEFAULT_OPERATIONAL_ALERT_INTERVAL_MINUTES = 5;
const MIN_COUNT_GT_VALUE = 1;
const MAX_COUNT_GT_VALUE = 1_000_000;
const MIN_AUTH_REFRESH_WINDOW_MINUTES = 1;
const MAX_AUTH_REFRESH_WINDOW_MINUTES = 1440;
const DEFAULT_AUTH_REFRESH_WINDOW_MINUTES = 15;

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

type AuthRefreshReuseQueryPayload = { windowMinutes: number };

type VerificationQueueQueryPayload = {
  status?: string;
  stripeIdentityStatus?: string;
  country?: string;
  contractorKind?: string;
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

function parseAuthRefreshReuseQuery(raw: unknown): AuthRefreshReuseQueryPayload | null {
  if (raw === null || typeof raw !== `object` || Array.isArray(raw)) {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const w = candidate.windowMinutes;
  if (typeof w !== `number` || !Number.isInteger(w)) {
    return null;
  }
  return { windowMinutes: w };
}

function parseVerificationQueueQuery(raw: unknown): VerificationQueueQueryPayload | null {
  if (raw === null || raw === undefined) {
    return {};
  }
  if (typeof raw !== `object` || Array.isArray(raw)) {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const result: VerificationQueueQueryPayload = {};
  if (typeof candidate.status === `string` && candidate.status.trim().length > 0) {
    result.status = candidate.status.trim();
  }
  if (typeof candidate.stripeIdentityStatus === `string` && candidate.stripeIdentityStatus.trim().length > 0) {
    result.stripeIdentityStatus = candidate.stripeIdentityStatus.trim();
  }
  if (typeof candidate.country === `string` && candidate.country.trim().length > 0) {
    result.country = candidate.country.trim();
  }
  if (typeof candidate.contractorKind === `string` && candidate.contractorKind.trim().length > 0) {
    result.contractorKind = candidate.contractorKind.trim();
  }
  return result;
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

function describeQueryPayload(workspace: OperationalAlertWorkspace, raw: unknown): string {
  if (workspace === `ledger_anomalies`) {
    const parsed = parseLedgerAnomaliesAlertQuery(raw);
    if (!parsed) return `Class: unknown`;
    const tail = [
      parsed.dateFrom ? `dateFrom=${parsed.dateFrom}` : null,
      parsed.dateTo ? `dateTo=${parsed.dateTo}` : null,
    ]
      .filter(Boolean)
      .join(`, `);
    return tail ? `Class: ${parsed.class}, ${tail}` : `Class: ${parsed.class}`;
  }
  if (workspace === `auth_refresh_reuse`) {
    const parsed = parseAuthRefreshReuseQuery(raw);
    return parsed ? `Window: ${parsed.windowMinutes}m` : `Window: unknown`;
  }
  if (workspace === `verification_queue`) {
    const parsed = parseVerificationQueueQuery(raw);
    if (!parsed) return `Filters: invalid payload`;
    const parts = [
      parsed.status ? `status=${parsed.status}` : null,
      parsed.stripeIdentityStatus ? `stripeIdentityStatus=${parsed.stripeIdentityStatus}` : null,
      parsed.country ? `country=${parsed.country}` : null,
      parsed.contractorKind ? `contractorKind=${parsed.contractorKind}` : null,
    ].filter(Boolean);
    return parts.length === 0 ? `Filters: (none — total queue)` : `Filters: ${parts.join(`, `)}`;
  }
  return `Workspace not surfaced`;
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
  const queryPayloadJson = JSON.stringify(alert.queryPayload ?? null);
  const thresholdJson = JSON.stringify(alert.thresholdPayload);

  return (
    <article className="panel" aria-label={`Operational alert ${alert.name}`}>
      <div className="pageHeader">
        <div>
          <strong>{alert.name}</strong>
          {alert.description ? <p className="muted">{alert.description}</p> : null}
          <p className="muted mono">{describeQueryPayload(alert.workspace, alert.queryPayload)}</p>
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

function CreateLedgerAnomaliesAlertForm() {
  const defaultQueryPayload: LedgerAnomaliesAlertQueryPayload = { class: `stalePendingEntries` };
  const defaultThresholdPayload = { type: `count_gt`, value: 5 };
  return (
    <article className="panel">
      <h3>New ledger anomalies alert</h3>
      <p className="muted">
        Backend treats queryPayload as opaque (workspace handler owns the schema) and parses thresholdPayload
        structurally. Only count_gt is supported.
      </p>
      <form action={createOperationalAlertAction} className="formStack">
        <input type="hidden" name="workspace" value="ledger_anomalies" />
        <label className="field">
          <span>Name</span>
          <input
            name="name"
            required
            maxLength={MAX_OPERATIONAL_ALERT_NAME_LENGTH}
            placeholder="e.g. Stale pending entries spike"
            aria-label="New ledger anomalies alert name"
          />
        </label>
        <label className="field">
          <span>Description</span>
          <input
            name="description"
            maxLength={MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH}
            placeholder="Optional"
            aria-label="New ledger anomalies alert description"
          />
        </label>
        <label className="field">
          <span>Query payload (anomaly class)</span>
          <input
            name="queryPayload"
            type="text"
            defaultValue={JSON.stringify(defaultQueryPayload)}
            required
            aria-label="New ledger anomalies alert query payload"
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
            aria-label="New ledger anomalies alert threshold payload"
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
            aria-label="New ledger anomalies alert evaluation interval"
          />
        </label>
        <button className="primaryButton" type="submit">
          Create alert
        </button>
      </form>
    </article>
  );
}

function CreateAuthRefreshReuseAlertForm() {
  const defaultQueryPayload: AuthRefreshReuseQueryPayload = {
    windowMinutes: DEFAULT_AUTH_REFRESH_WINDOW_MINUTES,
  };
  const defaultThresholdPayload = { type: `count_gt`, value: 1 };
  return (
    <article className="panel">
      <h3>New auth refresh reuse alert</h3>
      <p className="muted">
        Fires when admin refresh-token reuse events exceed the threshold within the rolling window. Window range: [
        {MIN_AUTH_REFRESH_WINDOW_MINUTES}..{MAX_AUTH_REFRESH_WINDOW_MINUTES}] minutes.
      </p>
      <form action={createOperationalAlertAction} className="formStack">
        <input type="hidden" name="workspace" value="auth_refresh_reuse" />
        <label className="field">
          <span>Name</span>
          <input
            name="name"
            required
            maxLength={MAX_OPERATIONAL_ALERT_NAME_LENGTH}
            placeholder="e.g. Refresh reuse spike"
            aria-label="New auth refresh reuse alert name"
          />
        </label>
        <label className="field">
          <span>Description</span>
          <input
            name="description"
            maxLength={MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH}
            placeholder="Optional"
            aria-label="New auth refresh reuse alert description"
          />
        </label>
        <label className="field">
          <span>Query payload (rolling window)</span>
          <input
            name="queryPayload"
            type="text"
            defaultValue={JSON.stringify(defaultQueryPayload)}
            required
            aria-label="New auth refresh reuse alert query payload"
          />
          <span className="muted">
            JSON shape:{` `}
            {`{ "windowMinutes": <integer ${MIN_AUTH_REFRESH_WINDOW_MINUTES}-${MAX_AUTH_REFRESH_WINDOW_MINUTES}> }`}
          </span>
        </label>
        <label className="field">
          <span>Threshold payload</span>
          <input
            name="thresholdPayload"
            type="text"
            defaultValue={JSON.stringify(defaultThresholdPayload)}
            required
            aria-label="New auth refresh reuse alert threshold payload"
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
            aria-label="New auth refresh reuse alert evaluation interval"
          />
        </label>
        <button className="primaryButton" type="submit">
          Create alert
        </button>
      </form>
    </article>
  );
}

function CreateVerificationQueueAlertForm() {
  const defaultQueryPayload: VerificationQueueQueryPayload = {};
  const defaultThresholdPayload = { type: `count_gt`, value: 25 };
  return (
    <article className="panel">
      <h3>New verification queue alert</h3>
      <p className="muted">
        Fires when the verification queue size (filtered by the optional accept-list keys below) exceeds the threshold.
        An empty payload (<code>{`{}`}</code>) monitors the total queue.
      </p>
      <form action={createOperationalAlertAction} className="formStack">
        <input type="hidden" name="workspace" value="verification_queue" />
        <label className="field">
          <span>Name</span>
          <input
            name="name"
            required
            maxLength={MAX_OPERATIONAL_ALERT_NAME_LENGTH}
            placeholder="e.g. Verification queue backlog"
            aria-label="New verification queue alert name"
          />
        </label>
        <label className="field">
          <span>Description</span>
          <input
            name="description"
            maxLength={MAX_OPERATIONAL_ALERT_DESCRIPTION_LENGTH}
            placeholder="Optional"
            aria-label="New verification queue alert description"
          />
        </label>
        <label className="field">
          <span>Query payload (optional filters)</span>
          <input
            name="queryPayload"
            type="text"
            defaultValue={JSON.stringify(defaultQueryPayload)}
            required
            aria-label="New verification queue alert query payload"
          />
          <span className="muted">
            JSON shape:{` `}
            {`{ "status"?: string, "stripeIdentityStatus"?: string, "country"?: string, "contractorKind"?: string }`}
          </span>
          <span className="muted">
            Note: filters <code>missingProfileData</code> and <code>missingDocuments</code> are saved but cannot be used
            by alert evaluation (frontend-only filters).
          </span>
        </label>
        <label className="field">
          <span>Threshold payload</span>
          <input
            name="thresholdPayload"
            type="text"
            defaultValue={JSON.stringify(defaultThresholdPayload)}
            required
            aria-label="New verification queue alert threshold payload"
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
            aria-label="New verification queue alert evaluation interval"
          />
        </label>
        <button className="primaryButton" type="submit">
          Create alert
        </button>
      </form>
    </article>
  );
}

function WorkspaceSection({
  workspace,
  title,
  caption,
  response,
  now,
}: {
  workspace: OperationalAlertWorkspace;
  title: string;
  caption: string;
  response: Awaited<ReturnType<typeof getOperationalAlerts>>;
  now: Date;
}) {
  const alerts = response?.alerts ?? [];
  return (
    <section className="panel" aria-label={`Operational alerts list ${workspace}`}>
      <div className="pageHeader">
        <div>
          <h2>{title}</h2>
          <p className="muted">{caption}</p>
          <p className="muted">{alerts.length} alert(s)</p>
        </div>
      </div>
      <div className="formStack">
        {response === null ? (
          <p className="muted">Operational alerts list is temporarily unavailable from the backend. Try again later.</p>
        ) : alerts.length === 0 ? (
          <p className="muted">No alerts yet for this workspace.</p>
        ) : (
          alerts.map((alert) => <AlertRow key={alert.id} alert={alert} now={now} />)
        )}
      </div>
      {workspace === `ledger_anomalies` ? <CreateLedgerAnomaliesAlertForm /> : null}
      {workspace === `auth_refresh_reuse` ? <CreateAuthRefreshReuseAlertForm /> : null}
      {workspace === `verification_queue` ? <CreateVerificationQueueAlertForm /> : null}
    </section>
  );
}

export default async function OperationalAlertsPage() {
  const [ledgerResponse, verificationQueueResponse, authRefreshReuseResponse] = await Promise.all([
    getOperationalAlerts({ workspace: `ledger_anomalies` }),
    getOperationalAlerts({ workspace: `verification_queue` }),
    getOperationalAlerts({ workspace: `auth_refresh_reuse` }),
  ]);
  const now = new Date();

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Operational alerts</h1>
          <p className="muted">
            Personal alerts on supported workspaces. Backend evaluates every 5 minutes; in-app fired-state badge only.
          </p>
        </div>
      </section>

      <WorkspaceSection
        workspace="ledger_anomalies"
        title="Ledger anomalies alerts"
        caption="Threshold-based monitoring on ledger anomaly counts."
        response={ledgerResponse}
        now={now}
      />

      <WorkspaceSection
        workspace="verification_queue"
        title="Verification queue alerts"
        caption="Threshold-based monitoring on verification queue size (filtered or total)."
        response={verificationQueueResponse}
        now={now}
      />

      <WorkspaceSection
        workspace="auth_refresh_reuse"
        title="Auth refresh reuse alerts"
        caption="Threshold-based monitoring on admin refresh-token reuse detections."
        response={authRefreshReuseResponse}
        now={now}
      />
    </>
  );
}
