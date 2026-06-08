import {
  ADMIN_V2_DEFAULT_AUTH_REFRESH_REUSE_WINDOW_MINUTES,
  ADMIN_V2_MAX_AUTH_REFRESH_REUSE_WINDOW_MINUTES,
  ADMIN_V2_MIN_AUTH_REFRESH_REUSE_WINDOW_MINUTES,
  ADMIN_V2_MIN_COUNT_GT_VALUE,
} from '@remoola/api-types';

import { TinyPill } from '../../components/tiny-pill';
import { fieldClass, fieldLabelClass, mutedTextClass, textInputClass } from '../../components/ui-classes';
import { type getOperationalAlerts } from '../../lib/admin-api/overview.server';
import {
  type LedgerAnomalyClass,
  type OperationalAlertSummary,
  type OperationalAlertThreshold,
  type OperationalAlertWorkspace,
} from '../../lib/admin-api/types';
import { formatDateTime } from '../../lib/admin-format';
import {
  LEDGER_ANOMALY_CLASS_LABELS,
  LEDGER_ANOMALY_CLASS_ORDER,
  isLedgerAnomalyClass,
} from '../../lib/admin-surface-meta';
import {
  describeVerificationQueuePayload,
  parseAuthRefreshReuseAlertQueryPayload,
  parseVerificationQueuePayload,
} from '../../lib/admin-surface-payloads';

export type WorkspaceResponse = Awaited<ReturnType<typeof getOperationalAlerts>>;

export type LedgerAnomaliesAlertQueryPayload = {
  class: LedgerAnomalyClass;
  dateFrom?: string;
  dateTo?: string;
};

export function parseLedgerAnomaliesAlertQuery(raw: unknown): LedgerAnomaliesAlertQueryPayload | null {
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

export function getCountThresholdValue(threshold: OperationalAlertThreshold): number {
  return threshold.type === `count_gt` ? threshold.value : ADMIN_V2_MIN_COUNT_GT_VALUE;
}

export function formatThreshold(threshold: OperationalAlertThreshold): string {
  if (threshold.type === `count_gt`) {
    return `count > ${threshold.value}`;
  }
  return `Unsupported threshold`;
}

export function isCurrentlyFiring(alert: OperationalAlertSummary, now: Date): boolean {
  if (!alert.lastFiredAt) return false;
  const firedAt = new Date(alert.lastFiredAt).getTime();
  if (Number.isNaN(firedAt)) return false;
  const windowMs = alert.evaluationIntervalMinutes * 2 * 60 * 1000;
  return now.getTime() - firedAt <= windowMs;
}

export function describeQueryPayload(workspace: OperationalAlertWorkspace, raw: unknown): string {
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

export function AlertStateBadges({ alert, now }: { alert: OperationalAlertSummary; now: Date }) {
  const firing = isCurrentlyFiring(alert, now);
  return (
    <div className="actionsRow" aria-label="Alert state">
      {firing ? (
        <TinyPill tone="rose" className="min-h-0">
          FIRED
        </TinyPill>
      ) : alert.lastFiredAt ? (
        <span className={mutedTextClass} title={alert.lastFireReason ?? undefined}>
          Last fired: {formatDateTime(alert.lastFiredAt)}
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

export function AlertQueryFields({ workspace, raw }: { workspace: OperationalAlertWorkspace; raw: unknown }) {
  if (workspace === `ledger_anomalies`) {
    return <LedgerAnomaliesQueryFields raw={raw} />;
  }
  if (workspace === `auth_refresh_reuse`) {
    return <AuthRefreshReuseQueryFields raw={raw} />;
  }
  return <VerificationQueueQueryFields raw={raw} />;
}
