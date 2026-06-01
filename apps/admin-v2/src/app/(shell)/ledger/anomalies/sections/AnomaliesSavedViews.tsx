import Link from 'next/link';

import { type SavedViewSummary } from '../../../../../lib/admin-api/types';
import {
  deleteSavedViewAction,
  updateSavedViewAction,
  createSavedViewAction,
} from '../../../../../lib/admin-mutations/saved-views.server';
import { SHARED_DESCRIPTION_MAX_LENGTH, SHARED_NAME_MAX_LENGTH } from '../../../../../lib/admin-surface-meta';
import {
  type BuildHrefFn,
  type LedgerAnomaliesSavedViewPayload,
  SAVED_VIEW_WORKSPACE,
  parseSavedViewPayload,
} from '../anomalies-shared';

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

export function AnomaliesSavedViews({
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
          <p className="muted">
            Personal durable filters for ledger anomalies. Alerts use the same query model, but a saved view is not
            linked to an alert automatically.
          </p>
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
            <p className="muted">
              Alerts evaluate the same query payload, but saving a view does not create or update an alert.
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
