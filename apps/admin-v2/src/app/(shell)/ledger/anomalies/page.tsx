import Link from 'next/link';

import {
  getAdminIdentity,
  getLedgerAnomalies,
  getLedgerAnomaliesSummary,
  getSavedViews,
  type LedgerAnomalyClass,
  type LedgerAnomalyListResponse,
  type SavedViewSummary,
} from '../../../../lib/admin-api.server';
import { formatDateTime, getDefaultLookbackDateOnlyRange } from '../../../../lib/admin-format';
import {
  createSavedViewAction,
  deleteSavedViewAction,
  updateSavedViewAction,
} from '../../../../lib/admin-mutations.server';
import {
  isLedgerAnomalyClass,
  LEDGER_ANOMALY_CLASS_LABELS,
  LEDGER_ANOMALY_CLASS_ORDER,
  SHARED_DESCRIPTION_MAX_LENGTH,
  SHARED_NAME_MAX_LENGTH,
} from '../../../../lib/admin-surface-meta';

const SAVED_VIEW_WORKSPACE = `ledger_anomalies` as const;

type LedgerAnomaliesSavedViewPayload = {
  class: LedgerAnomalyClass;
  dateFrom: string;
  dateTo: string;
};

function isYyyyMmDd(value: unknown): value is string {
  return typeof value === `string` && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseSavedViewPayload(raw: unknown): LedgerAnomaliesSavedViewPayload | null {
  if (raw === null || typeof raw !== `object` || Array.isArray(raw)) {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  if (!isLedgerAnomalyClass(typeof candidate.class === `string` ? candidate.class : undefined)) {
    return null;
  }
  if (!isYyyyMmDd(candidate.dateFrom) || !isYyyyMmDd(candidate.dateTo)) {
    return null;
  }
  return {
    class: candidate.class as LedgerAnomalyClass,
    dateFrom: candidate.dateFrom,
    dateTo: candidate.dateTo,
  };
}

function defaultDateRange() {
  return getDefaultLookbackDateOnlyRange();
}

type LedgerAnomalyItem = LedgerAnomalyListResponse[`items`][number];

function AnomalyCards({ items }: { items: LedgerAnomalyItem[] }) {
  if (items.length === 0) {
    return (
      <div className="queueCards">
        <article className="queueCard">
          <div className="muted">No anomalies found for the selected class and time window.</div>
        </article>
      </div>
    );
  }

  return (
    <div className="queueCards">
      {items.map((item) => (
        <article className="queueCard" key={item.id}>
          <div className="pageHeader">
            <div>
              <Link href={`/ledger/${item.ledgerEntryId}`}>
                <strong>{item.type}</strong>
              </Link>
              <div className="muted mono">{item.ledgerEntryId}</div>
            </div>
            <div className="muted">
              {item.amount} {item.currencyCode}
            </div>
          </div>
          <div className="queueCardBody">
            <div>
              Consumer: <Link href={`/consumers/${item.consumerId}`}>{item.consumerId}</Link>
            </div>
            <div>Status: {item.entryStatus}</div>
            <div className="muted">Latest outcome: {item.outcomeStatus ?? `-`}</div>
            <div className="muted">Outcome at: {formatDateTime(item.outcomeAt)}</div>
            <div className="muted">Created: {formatDateTime(item.createdAt)}</div>
            <p className="muted">{item.signal.detail}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function AnomalyTable({ items }: { items: LedgerAnomalyItem[] }) {
  return (
    <div className="tableWrap">
      <table className="tableDense">
        <thead>
          <tr>
            <th>Ledger entry</th>
            <th>Consumer</th>
            <th>Status</th>
            <th>Amount</th>
            <th>Signal detail</th>
            <th>Timestamps</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>
                <Link href={`/ledger/${item.ledgerEntryId}`}>
                  <strong>{item.type}</strong>
                </Link>
                <div className="muted mono">{item.ledgerEntryId}</div>
              </td>
              <td>
                <Link href={`/consumers/${item.consumerId}`}>{item.consumerId}</Link>
              </td>
              <td>
                <div>{item.entryStatus}</div>
                <div className="muted">Latest: {item.outcomeStatus ?? `-`}</div>
              </td>
              <td>
                {item.amount} {item.currencyCode}
              </td>
              <td>{item.signal.detail}</td>
              <td>
                <div className="muted">Outcome: {formatDateTime(item.outcomeAt)}</div>
                <div className="muted">Created: {formatDateTime(item.createdAt)}</div>
              </td>
            </tr>
          ))}
          {items.length === 0 ? (
            <tr>
              <td colSpan={6}>No anomalies found for the selected class and time window.</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

type BuildHrefFn = (next: {
  className?: LedgerAnomalyClass;
  dateFrom?: string;
  dateTo?: string;
  cursor?: string | null;
}) => string;

function SavedViewRow({
  view,
  buildHref,
  canManageSavedViews,
}: {
  view: SavedViewSummary;
  buildHref: BuildHrefFn;
  canManageSavedViews: boolean;
}) {
  const payload = parseSavedViewPayload(view.queryPayload);
  const payloadJson = JSON.stringify(view.queryPayload ?? null);

  return (
    <div className="panel">
      <div className="pageHeader">
        <div>
          <strong>{view.name}</strong>
          {view.description ? <p className="muted">{view.description}</p> : null}
          {!payload ? (
            <p className="muted">
              Saved view payload could not be applied. The current default filters are loaded instead.
            </p>
          ) : null}
        </div>
        <div className="actionsRow">
          {payload ? (
            <Link
              className="secondaryButton"
              href={buildHref({
                className: payload.class,
                dateFrom: payload.dateFrom,
                dateTo: payload.dateTo,
                cursor: null,
              })}
            >
              Apply
            </Link>
          ) : (
            <Link className="secondaryButton" href={buildHref({ cursor: null })} aria-disabled="true">
              Use defaults
            </Link>
          )}
          {canManageSavedViews ? (
            <form action={deleteSavedViewAction.bind(null, view.id)}>
              <input type="hidden" name="workspace" value={view.workspace} />
              <button className="dangerButton" type="submit">
                Delete
              </button>
            </form>
          ) : null}
        </div>
      </div>
      {canManageSavedViews ? (
        <details>
          <summary className="muted">Rename or update</summary>
          <form action={updateSavedViewAction.bind(null, view.id)} className="formStack">
            <input type="hidden" name="workspace" value={view.workspace} />
            <input type="hidden" name="queryPayload" value={payloadJson} />
            <label className="field">
              <span>Name</span>
              <input
                name="name"
                defaultValue={view.name}
                required
                maxLength={SHARED_NAME_MAX_LENGTH}
                aria-label="Saved view name"
              />
            </label>
            <label className="field">
              <span>Description</span>
              <input
                name="description"
                defaultValue={view.description ?? ``}
                maxLength={SHARED_DESCRIPTION_MAX_LENGTH}
                aria-label="Saved view description"
              />
            </label>
            <button className="secondaryButton" type="submit">
              Save changes
            </button>
          </form>
        </details>
      ) : null}
    </div>
  );
}

function SavedViewsSection({
  views,
  currentPayload,
  buildHref,
  canManageSavedViews,
}: {
  views: SavedViewSummary[];
  currentPayload: LedgerAnomaliesSavedViewPayload;
  buildHref: BuildHrefFn;
  canManageSavedViews: boolean;
}) {
  return (
    <section className="panel" aria-label="Saved views">
      <div className="pageHeader">
        <div>
          <h2>Saved views</h2>
          <p className="muted">Personal saved filters for the ledger anomalies workspace.</p>
        </div>
      </div>
      <div className="formStack">
        {views.length === 0 ? (
          <p className="muted">
            {canManageSavedViews
              ? `No saved views yet. Use the form below to save the current filters.`
              : `Saved view management is not available for this admin identity.`}
          </p>
        ) : (
          views.map((view) => (
            <SavedViewRow key={view.id} view={view} buildHref={buildHref} canManageSavedViews={canManageSavedViews} />
          ))
        )}
      </div>
      {canManageSavedViews ? (
        <article className="panel">
          <h3>Save current view</h3>
          <form action={createSavedViewAction} className="formStack">
            <input type="hidden" name="workspace" value={SAVED_VIEW_WORKSPACE} />
            <input type="hidden" name="queryPayload" value={JSON.stringify(currentPayload)} />
            <label className="field">
              <span>Name</span>
              <input
                name="name"
                required
                maxLength={SHARED_NAME_MAX_LENGTH}
                placeholder="e.g. Stale entries last 7 days"
                aria-label="New saved view name"
              />
            </label>
            <label className="field">
              <span>Description</span>
              <input
                name="description"
                maxLength={SHARED_DESCRIPTION_MAX_LENGTH}
                placeholder="Optional"
                aria-label="New saved view description"
              />
            </label>
            <p className="muted mono">
              class={currentPayload.class}, dateFrom={currentPayload.dateFrom}, dateTo={currentPayload.dateTo}
            </p>
            <button className="primaryButton" type="submit">
              Save current view
            </button>
          </form>
        </article>
      ) : null}
    </section>
  );
}

export default async function LedgerAnomaliesPage({
  searchParams,
}: {
  searchParams?: Promise<{
    class?: string;
    dateFrom?: string;
    dateTo?: string;
    cursor?: string;
  }>;
}) {
  const params = await searchParams;
  const identity = await getAdminIdentity();
  const canManageSavedViews = identity?.capabilities.includes(`saved_views.manage`) ?? false;
  const defaults = defaultDateRange();
  const requestedClass = params?.class?.trim();
  const className: LedgerAnomalyClass = isLedgerAnomalyClass(requestedClass) ? requestedClass : `stalePendingEntries`;
  const dateFrom = params?.dateFrom?.trim() || defaults.dateFrom;
  const dateTo = params?.dateTo?.trim() || defaults.dateTo;
  const cursor = params?.cursor?.trim() || undefined;

  const [summary, list, savedViewsResponse] = await Promise.all([
    getLedgerAnomaliesSummary(),
    getLedgerAnomalies({
      className,
      dateFrom,
      dateTo,
      cursor,
      limit: 50,
    }),
    canManageSavedViews ? getSavedViews({ workspace: SAVED_VIEW_WORKSPACE }) : Promise.resolve(null),
  ]);

  const activeClass = summary?.classes[className];
  const savedViews = savedViewsResponse?.views ?? [];
  const currentPayload: LedgerAnomaliesSavedViewPayload = { class: className, dateFrom, dateTo };

  function buildHref(next: {
    className?: LedgerAnomalyClass;
    dateFrom?: string;
    dateTo?: string;
    cursor?: string | null;
  }) {
    const query = new URLSearchParams();
    query.set(`class`, next.className ?? className);
    query.set(`dateFrom`, next.dateFrom ?? dateFrom);
    if (next.dateTo ?? dateTo) {
      query.set(`dateTo`, next.dateTo ?? dateTo);
    }
    if (next.cursor) {
      query.set(`cursor`, next.cursor);
    }

    return `/ledger/anomalies?${query.toString()}`;
  }

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Ledger anomalies</h1>
          <p className="muted">Read-only investigation surface.</p>
        </div>
        <p className="muted">Computed: {formatDateTime(summary?.computedAt)}</p>
      </section>

      <section className="statsGrid">
        {LEDGER_ANOMALY_CLASS_ORDER.map((key) => {
          const item = summary?.classes[key];
          return (
            <article key={key} className="panel">
              <div className="pageHeader">
                <div>
                  <h2>{item?.label ?? key}</h2>
                  <p className="muted">Phase: {item?.phaseStatus ?? `live-actionable`}</p>
                </div>
                <Link className="secondaryButton" href={buildHref({ className: key, cursor: null })}>
                  Open
                </Link>
              </div>
              <p className="muted">Availability: {item?.availability ?? `temporarily-unavailable`}</p>
              <p>{item?.count == null ? `-` : String(item.count)} items</p>
            </article>
          );
        })}
      </section>

      <section className="panel pageHeader">
        <nav className="actionsRow" aria-label="Anomaly classes">
          {LEDGER_ANOMALY_CLASS_ORDER.map((key) => (
            <Link
              key={key}
              className="secondaryButton"
              href={buildHref({ className: key, cursor: null })}
              aria-current={key === className ? `page` : undefined}
            >
              {LEDGER_ANOMALY_CLASS_LABELS[key]}
            </Link>
          ))}
        </nav>
      </section>

      <SavedViewsSection
        views={savedViews}
        currentPayload={currentPayload}
        buildHref={buildHref}
        canManageSavedViews={canManageSavedViews}
      />

      <section className="panel pageHeader">
        <form className="actionsRow" method="get">
          <input type="hidden" name="class" value={className} />
          <input name="dateFrom" type="date" defaultValue={dateFrom} aria-label="Date from" />
          <input name="dateTo" type="date" defaultValue={dateTo} aria-label="Date to" />
          <button className="secondaryButton" type="submit">
            Apply
          </button>
          <Link
            className="secondaryButton"
            href={buildHref({ className, dateFrom: defaults.dateFrom, dateTo: defaults.dateTo, cursor: null })}
          >
            Reset
          </Link>
        </form>
      </section>

      <section className="panel">
        <div className="pageHeader">
          <div>
            <h2>{activeClass?.label ?? `Ledger anomalies`}</h2>
            <p className="muted">
              {list ? `${list.items.length} rows in this window` : `Queue unavailable from the backend read contract.`}
            </p>
          </div>
          {list?.nextCursor ? (
            <Link className="secondaryButton" href={buildHref({ cursor: list.nextCursor })}>
              Next
            </Link>
          ) : null}
        </div>

        {list ? (
          <>
            <AnomalyCards items={list.items} />
            <AnomalyTable items={list.items} />
          </>
        ) : (
          <p className="muted">
            Ledger anomaly queue is temporarily unavailable. Use the overview or system surface for fallback navigation.
          </p>
        )}
        {activeClass?.availability === `temporarily-unavailable` && list?.items.length === 0 ? (
          <p className="muted">
            This anomaly class is temporarily unavailable right now. Retry later or use overview/system for fallback
            triage.
          </p>
        ) : null}
      </section>
    </>
  );
}
