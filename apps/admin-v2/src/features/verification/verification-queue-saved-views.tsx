import { type AdminV2VerificationQueuePayload } from '@remoola/api-types';
import { cn } from '@remoola/ui';

import { ActionGhost } from '../../components/action-ghost';
import { ActionPrimary } from '../../components/action-primary';
import { Panel } from '../../components/panel';
import { TinyPill } from '../../components/tiny-pill';
import {
  buttonRowClass,
  dangerButtonClass,
  detailsSummaryClass,
  fieldClass,
  fieldLabelClass,
  monoMutedTextClass,
  mutedTextClass,
  panelClass,
  stackClass,
  textInputClass,
} from '../../components/ui-classes';
import { type SavedViewSummary } from '../../lib/admin-api/types';
import {
  createSavedViewAction,
  deleteSavedViewAction,
  updateSavedViewAction,
} from '../../lib/admin-mutations/saved-views.server';
import { SHARED_DESCRIPTION_MAX_LENGTH, SHARED_NAME_MAX_LENGTH } from '../../lib/admin-surface-meta';
import { describeVerificationQueuePayload, parseVerificationQueuePayload } from '../../lib/admin-surface-payloads';

const SAVED_VIEW_WORKSPACE = `verification_queue` as const;

type BuildVerificationHref = (next: { payload?: AdminV2VerificationQueuePayload | null; page?: number }) => string;

function SavedViewRow({
  view,
  buildHref,
  canManageSavedViews,
}: {
  view: SavedViewSummary;
  buildHref: BuildVerificationHref;
  canManageSavedViews: boolean;
}) {
  const payload = parseVerificationQueuePayload(view.queryPayload);
  const payloadJson = JSON.stringify(view.queryPayload ?? null);

  return (
    <Panel
      className="gap-4"
      actions={
        <div className={buttonRowClass}>
          {payload ? (
            <ActionGhost href={buildHref({ payload, page: 1 })}>Apply</ActionGhost>
          ) : (
            <ActionGhost href={buildHref({ payload: null, page: 1 })} ariaDisabled>
              Use defaults
            </ActionGhost>
          )}
          {canManageSavedViews ? (
            <form action={deleteSavedViewAction.bind(null, view.id)}>
              <input type="hidden" name="workspace" value={view.workspace} />
              <button className={dangerButtonClass} type="submit">
                Delete
              </button>
            </form>
          ) : null}
        </div>
      }
    >
      <div className="min-w-0">
        <strong>{view.name}</strong>
        {view.description ? <p className={mutedTextClass}>{view.description}</p> : null}
        {!payload ? (
          <p className={mutedTextClass}>
            Saved view payload could not be applied. The current default filters are loaded instead.
          </p>
        ) : null}
      </div>
      {canManageSavedViews ? (
        <details>
          <summary className={detailsSummaryClass}>Rename or update</summary>
          <form action={updateSavedViewAction.bind(null, view.id)} className={stackClass}>
            <input type="hidden" name="workspace" value={view.workspace} />
            <input type="hidden" name="queryPayload" value={payloadJson} />
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Name</span>
              <input
                className={textInputClass}
                name="name"
                defaultValue={view.name}
                required
                maxLength={SHARED_NAME_MAX_LENGTH}
                aria-label="Saved view name"
              />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Description</span>
              <input
                className={textInputClass}
                name="description"
                defaultValue={view.description ?? ``}
                maxLength={SHARED_DESCRIPTION_MAX_LENGTH}
                aria-label="Saved view description"
              />
            </label>
            <ActionGhost type="submit">Save changes</ActionGhost>
          </form>
        </details>
      ) : null}
    </Panel>
  );
}

export function SavedViewsSection({
  views,
  currentPayload,
  buildHref,
  hasInvalidPayload,
  canManageSavedViews,
}: {
  views: SavedViewSummary[];
  currentPayload: AdminV2VerificationQueuePayload;
  buildHref: BuildVerificationHref;
  hasInvalidPayload: boolean;
  canManageSavedViews: boolean;
}) {
  const hasViews = views.length > 0;
  const shouldExpandSavedViews = hasInvalidPayload || !hasViews;

  return (
    <Panel
      title="Saved views"
      description="Personal durable filters for the verification queue. Alerts use the same query model, but a saved view is not linked to an alert automatically."
      actions={
        <div className={buttonRowClass}>
          <TinyPill tone="cyan">{views.length} saved</TinyPill>
          <TinyPill>{canManageSavedViews ? `Manage enabled` : `Read-only access`}</TinyPill>
        </div>
      }
      surface="meta"
    >
      {hasInvalidPayload ? (
        <p className={mutedTextClass}>
          One or more saved views have an unrecognised payload shape and cannot be applied. Default filters are used
          instead for those rows.
        </p>
      ) : null}
      <details open={shouldExpandSavedViews}>
        <summary className={detailsSummaryClass}>
          {hasViews ? `Open saved views list` : `Open saved views section`}
        </summary>
        <div className="mt-4">
          <div className={stackClass}>
            {!hasViews ? (
              <p className={mutedTextClass}>
                {canManageSavedViews
                  ? `No saved views yet. Use the compact form below to save the current filters.`
                  : `Saved view management is not available for this admin identity.`}
              </p>
            ) : (
              views.map((view) => (
                <SavedViewRow
                  key={view.id}
                  view={view}
                  buildHref={buildHref}
                  canManageSavedViews={canManageSavedViews}
                />
              ))
            )}
          </div>
        </div>
      </details>
      {canManageSavedViews ? (
        <details className="mt-4">
          <summary className={detailsSummaryClass}>Save current filters as a view</summary>
          <article className={cn(`mt-4`, panelClass)}>
            <h3>Save current view</h3>
            <form action={createSavedViewAction} className={stackClass}>
              <input type="hidden" name="workspace" value={SAVED_VIEW_WORKSPACE} />
              <input type="hidden" name="queryPayload" value={JSON.stringify(currentPayload)} />
              <label className={fieldClass}>
                <span className={fieldLabelClass}>Name</span>
                <input
                  className={textInputClass}
                  name="name"
                  required
                  maxLength={SHARED_NAME_MAX_LENGTH}
                  placeholder="e.g. Pending DE individuals"
                  aria-label="New saved view name"
                />
              </label>
              <label className={fieldClass}>
                <span className={fieldLabelClass}>Description</span>
                <input
                  className={textInputClass}
                  name="description"
                  maxLength={SHARED_DESCRIPTION_MAX_LENGTH}
                  placeholder="Optional"
                  aria-label="New saved view description"
                />
              </label>
              <p className={mutedTextClass}>
                Note: alerts evaluate the same query payload, but saving a view does not create or update an alert.
              </p>
              <p className={monoMutedTextClass}>{describeVerificationQueuePayload(currentPayload)}</p>
              <ActionPrimary type="submit">Save current view</ActionPrimary>
            </form>
          </article>
        </details>
      ) : null}
    </Panel>
  );
}
