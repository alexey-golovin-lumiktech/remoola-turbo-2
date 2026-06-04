import Link from 'next/link';

import { type AdminV2VerificationQueuePayload } from '@remoola/api-types';
import { cn } from '@remoola/ui';

import { ActionGhost } from '../../components/action-ghost';
import { ActionPrimary } from '../../components/action-primary';
import { DenseTable } from '../../components/dense-table';
import { MobileQueueCard, MobileQueueSection } from '../../components/mobile-queue-card';
import { Panel } from '../../components/panel';
import { StatusPill } from '../../components/status-pill';
import { TabletRow } from '../../components/tablet-row';
import { TinyPill } from '../../components/tiny-pill';
import {
  buttonRowClass,
  dangerButtonClass,
  detailsSummaryClass,
  emptyPanelClass,
  fieldClass,
  fieldLabelClass,
  ghostButtonClass,
  monoMutedTextClass,
  mutedTextClass,
  panelClass,
  stackClass,
  textInputClass,
} from '../../components/ui-classes';
import { type SavedViewSummary } from '../../lib/admin-api/types';
import { type getVerificationQueue } from '../../lib/admin-api/verification.server';
import { EMPTY_VALUE, formatDate } from '../../lib/admin-format';
import {
  deleteSavedViewAction,
  updateSavedViewAction,
  createSavedViewAction,
} from '../../lib/admin-mutations/saved-views.server';
import { SHARED_DESCRIPTION_MAX_LENGTH, SHARED_NAME_MAX_LENGTH } from '../../lib/admin-surface-meta';
import { describeVerificationQueuePayload, parseVerificationQueuePayload } from '../../lib/admin-surface-payloads';
import { withReturnTo } from '../../lib/navigation-context';

const SAVED_VIEW_WORKSPACE = `verification_queue` as const;

type VerificationItem = NonNullable<Awaited<ReturnType<typeof getVerificationQueue>>>[`items`][number];

type BuildVerificationHref = (next: { payload?: AdminV2VerificationQueuePayload | null; page?: number }) => string;

function renderVerificationAssignee(item: VerificationItem) {
  if (!item.assignedTo) {
    return <span className={mutedTextClass}>—</span>;
  }

  return (
    <>
      <div>{item.assignedTo.name ?? item.assignedTo.email ?? item.assignedTo.id}</div>
      {item.assignedTo.email ? <div className={mutedTextClass}>{item.assignedTo.email}</div> : null}
    </>
  );
}

function renderVerificationAssigneeSummary(item: VerificationItem): string {
  if (!item.assignedTo) {
    return EMPTY_VALUE;
  }

  return item.assignedTo.name ?? item.assignedTo.email ?? item.assignedTo.id;
}

export function VerificationMobileCards({ items, returnTo }: { items: VerificationItem[]; returnTo: string }) {
  if (items.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className={emptyPanelClass}>No verification cases matched the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface md:hidden" data-view="mobile">
      <div className="queueCards">
        {items.map((item) => (
          <MobileQueueCard
            key={item.id}
            id={item.id}
            href={withReturnTo(`/verification/${item.id}`, returnTo)}
            eyebrow="Verification case"
            title={item.email}
            subtitle={item.id}
            trailing={<StatusPill status={item.verificationStatus} />}
            badges={
              <>
                <TinyPill>{item.accountType}</TinyPill>
                <TinyPill>{item.country ?? `No country`}</TinyPill>
              </>
            }
          >
            <MobileQueueSection title="Review summary">
              <div className={mutedTextClass}>Assigned: {renderVerificationAssigneeSummary(item)}</div>
              <div className={mutedTextClass}>
                {item.missingDocuments ? `Missing documents` : `${item.documentsCount} attached`}
              </div>
              <div className={mutedTextClass}>SLA: {item.slaBreached ? `Breached` : `Within SLA`}</div>
            </MobileQueueSection>
            <MobileQueueSection title="Identity" compact>
              <div className={mutedTextClass}>Stripe: {item.stripeIdentityStatus ?? EMPTY_VALUE}</div>
              <div>
                {item.accountType} · {item.country ?? EMPTY_VALUE}
              </div>
            </MobileQueueSection>
            <MobileQueueSection title="Completion blockers" compact>
              <div className={mutedTextClass}>{item.missingProfileData ? `Missing profile data` : `Profile ready`}</div>
              <div className={mutedTextClass}>Updated: {formatDate(item.updatedAt)}</div>
            </MobileQueueSection>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

export function VerificationTabletRows({ items, returnTo }: { items: VerificationItem[]; returnTo: string }) {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className={emptyPanelClass}>No verification cases matched the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
      <div className="condensedList">
        {items.map((item) => (
          <TabletRow
            key={item.id}
            eyebrow="Verification case"
            primary={
              <>
                <Link href={withReturnTo(`/verification/${item.id}`, returnTo)}>
                  <strong>{item.email}</strong>
                </Link>
                <div className={monoMutedTextClass}>{item.id}</div>
              </>
            }
            badges={
              <>
                <StatusPill status={item.verificationStatus} />
                <TinyPill>{item.accountType}</TinyPill>
                <TinyPill>{item.country ?? `No country`}</TinyPill>
              </>
            }
            cells={[
              <div key="status">
                <div className={mutedTextClass}>{item.stripeIdentityStatus ?? EMPTY_VALUE}</div>
              </div>,
              <div key="profile">
                <div>{item.accountType}</div>
                <div className={mutedTextClass}>{item.country ?? EMPTY_VALUE}</div>
                <div className={mutedTextClass}>
                  {item.missingProfileData ? `Missing profile data` : `Profile ready`}
                </div>
              </div>,
              <div key="docs-sla">
                <div>{item.missingDocuments ? `Missing documents` : `${item.documentsCount} attached`}</div>
                <div className={mutedTextClass}>{item.slaBreached ? `Breached` : `Within SLA`}</div>
              </div>,
              <div key="assigned-updated">
                <div>{renderVerificationAssigneeSummary(item)}</div>
                <div className={mutedTextClass}>{formatDate(item.updatedAt)}</div>
              </div>,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

export function VerificationDesktopTable({ items, returnTo }: { items: VerificationItem[]; returnTo: string }) {
  return (
    <div className="readSurface hidden xl:block" data-view="desktop">
      <DenseTable
        headers={[`Consumer`, `Status`, `Profile`, `Docs`, `SLA`, `Assigned to`, `Updated`]}
        emptyMessage="No verification cases matched the current filters."
      >
        {items.length === 0
          ? null
          : items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link href={withReturnTo(`/verification/${item.id}`, returnTo)}>{item.email}</Link>
                  <div className={monoMutedTextClass}>{item.id}</div>
                </td>
                <td>
                  <div>
                    <StatusPill status={item.verificationStatus} />
                  </div>
                  <div className={mutedTextClass}>{item.stripeIdentityStatus ?? EMPTY_VALUE}</div>
                </td>
                <td>
                  <div>{item.accountType}</div>
                  <div className={mutedTextClass}>{item.country ?? EMPTY_VALUE}</div>
                  <div className={mutedTextClass}>
                    {item.missingProfileData ? `Missing profile data` : `Profile ready`}
                  </div>
                </td>
                <td>{item.missingDocuments ? `Missing documents` : `${item.documentsCount} attached`}</td>
                <td>{item.slaBreached ? `Breached` : `Within SLA`}</td>
                <td>{renderVerificationAssignee(item)}</td>
                <td>{formatDate(item.updatedAt)}</td>
              </tr>
            ))}
      </DenseTable>
    </div>
  );
}

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

export { ghostButtonClass };
