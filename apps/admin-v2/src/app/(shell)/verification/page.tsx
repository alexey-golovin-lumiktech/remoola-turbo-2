import Link from 'next/link';

import { cn } from '@remoola/ui';

import { ActionGhost } from '../../../components/action-ghost';
import { ActionPrimary } from '../../../components/action-primary';
import { DenseTable } from '../../../components/dense-table';
import { MobileQueueCard, MobileQueueSection } from '../../../components/mobile-queue-card';
import { Panel } from '../../../components/panel';
import { ResponsiveFilterPanel } from '../../../components/responsive-filter-panel';
import { StatusPill } from '../../../components/status-pill';
import { TabletRow } from '../../../components/tablet-row';
import { TinyPill } from '../../../components/tiny-pill';
import {
  buttonRowClass,
  checkboxFieldClass,
  checkboxInputClass,
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
} from '../../../components/ui-classes';
import { WorkspaceLayout } from '../../../components/workspace-layout';
import {
  getAdminIdentity,
  getQuickstart,
  getSavedViews,
  getVerificationQueue,
  type SavedViewSummary,
} from '../../../lib/admin-api.server';
import { formatDateTime } from '../../../lib/admin-format';
import {
  createSavedViewAction,
  deleteSavedViewAction,
  updateSavedViewAction,
} from '../../../lib/admin-mutations.server';
import { SHARED_DESCRIPTION_MAX_LENGTH, SHARED_NAME_MAX_LENGTH } from '../../../lib/admin-surface-meta';
import { buildPathWithSearch, withReturnTo } from '../../../lib/navigation-context';
import { parseQuickstartId } from '../../../lib/quickstart-investigations';

const SAVED_VIEW_WORKSPACE = `verification_queue` as const;

type VerificationQueueSavedViewPayload = {
  status?: string;
  stripeIdentityStatus?: string;
  country?: string;
  contractorKind?: string;
  missingProfileData?: boolean;
  missingDocuments?: boolean;
};

const SUPPORTED_PAYLOAD_KEYS = new Set<keyof VerificationQueueSavedViewPayload>([
  `status`,
  `stripeIdentityStatus`,
  `country`,
  `contractorKind`,
  `missingProfileData`,
  `missingDocuments`,
]);

type VerificationItem = NonNullable<Awaited<ReturnType<typeof getVerificationQueue>>>[`items`][number];

function parseSavedViewPayload(raw: unknown): VerificationQueueSavedViewPayload | null {
  if (raw === null || typeof raw !== `object` || Array.isArray(raw)) {
    return null;
  }
  const candidate = raw as Record<string, unknown>;
  const result: VerificationQueueSavedViewPayload = {};
  for (const key of Object.keys(candidate)) {
    if (!SUPPORTED_PAYLOAD_KEYS.has(key as keyof VerificationQueueSavedViewPayload)) {
      return null;
    }
  }
  if (candidate.status !== undefined) {
    if (typeof candidate.status !== `string`) return null;
    if (candidate.status.trim().length > 0) result.status = candidate.status.trim();
  }
  if (candidate.stripeIdentityStatus !== undefined) {
    if (typeof candidate.stripeIdentityStatus !== `string`) return null;
    if (candidate.stripeIdentityStatus.trim().length > 0)
      result.stripeIdentityStatus = candidate.stripeIdentityStatus.trim();
  }
  if (candidate.country !== undefined) {
    if (typeof candidate.country !== `string`) return null;
    if (candidate.country.trim().length > 0) result.country = candidate.country.trim();
  }
  if (candidate.contractorKind !== undefined) {
    if (typeof candidate.contractorKind !== `string`) return null;
    if (candidate.contractorKind.trim().length > 0) result.contractorKind = candidate.contractorKind.trim();
  }
  if (candidate.missingProfileData !== undefined) {
    if (typeof candidate.missingProfileData !== `boolean`) return null;
    if (candidate.missingProfileData) result.missingProfileData = true;
  }
  if (candidate.missingDocuments !== undefined) {
    if (typeof candidate.missingDocuments !== `boolean`) return null;
    if (candidate.missingDocuments) result.missingDocuments = true;
  }
  return result;
}

type BuildHrefFn = (next: { payload?: VerificationQueueSavedViewPayload | null; page?: number }) => string;

function appendPayloadToQuery(query: URLSearchParams, payload: VerificationQueueSavedViewPayload) {
  if (payload.status?.trim()) query.set(`status`, payload.status.trim());
  if (payload.stripeIdentityStatus?.trim()) query.set(`stripeIdentityStatus`, payload.stripeIdentityStatus.trim());
  if (payload.country?.trim()) query.set(`country`, payload.country.trim());
  if (payload.contractorKind?.trim()) query.set(`contractorKind`, payload.contractorKind.trim());
  if (payload.missingProfileData === true) query.set(`missingProfileData`, `true`);
  if (payload.missingDocuments === true) query.set(`missingDocuments`, `true`);
}

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
    return `—`;
  }

  return item.assignedTo.name ?? item.assignedTo.email ?? item.assignedTo.id;
}

function VerificationMobileCards({ items, returnTo }: { items: VerificationItem[]; returnTo: string }) {
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
            title={item.email}
            subtitle={item.id}
            trailing={<StatusPill status={item.verificationStatus} />}
          >
            <MobileQueueSection title="Identity">
              <div className={mutedTextClass}>Stripe: {item.stripeIdentityStatus ?? `-`}</div>
              <div>
                {item.accountType} · {item.country ?? `-`}
              </div>
            </MobileQueueSection>
            <MobileQueueSection title="Completion blockers">
              <div className={mutedTextClass}>{item.missingProfileData ? `Missing profile data` : `Profile ready`}</div>
              <div className={mutedTextClass}>
                {item.missingDocuments ? `Missing documents` : `${item.documentsCount} attached`}
              </div>
              <div className={mutedTextClass}>SLA: {item.slaBreached ? `Breached` : `Within SLA`}</div>
            </MobileQueueSection>
            <MobileQueueSection title="Ownership">
              <div className={mutedTextClass}>Assigned: {renderVerificationAssigneeSummary(item)}</div>
              <div className={mutedTextClass}>Updated: {formatDateTime(item.updatedAt)}</div>
            </MobileQueueSection>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function VerificationTabletRows({ items, returnTo }: { items: VerificationItem[]; returnTo: string }) {
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
            primary={
              <>
                <Link href={withReturnTo(`/verification/${item.id}`, returnTo)}>
                  <strong>{item.email}</strong>
                </Link>
                <div className={monoMutedTextClass}>{item.id}</div>
              </>
            }
            cells={[
              <div key="status">
                <div>
                  <StatusPill status={item.verificationStatus} />
                </div>
                <div className={mutedTextClass}>{item.stripeIdentityStatus ?? `-`}</div>
              </div>,
              <div key="profile">
                <div>{item.accountType}</div>
                <div className={mutedTextClass}>{item.country ?? `-`}</div>
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
                <div className={mutedTextClass}>{formatDateTime(item.updatedAt)}</div>
              </div>,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function VerificationDesktopTable({ items, returnTo }: { items: VerificationItem[]; returnTo: string }) {
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
                  <div className={mutedTextClass}>{item.stripeIdentityStatus ?? `-`}</div>
                </td>
                <td>
                  <div>{item.accountType}</div>
                  <div className={mutedTextClass}>{item.country ?? `-`}</div>
                  <div className={mutedTextClass}>
                    {item.missingProfileData ? `Missing profile data` : `Profile ready`}
                  </div>
                </td>
                <td>{item.missingDocuments ? `Missing documents` : `${item.documentsCount} attached`}</td>
                <td>{item.slaBreached ? `Breached` : `Within SLA`}</td>
                <td>{renderVerificationAssignee(item)}</td>
                <td>{formatDateTime(item.updatedAt)}</td>
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
  buildHref: BuildHrefFn;
  canManageSavedViews: boolean;
}) {
  const payload = parseSavedViewPayload(view.queryPayload);
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

function SavedViewsSection({
  views,
  currentPayload,
  buildHref,
  hasInvalidPayload,
  canManageSavedViews,
}: {
  views: SavedViewSummary[];
  currentPayload: VerificationQueueSavedViewPayload;
  buildHref: BuildHrefFn;
  hasInvalidPayload: boolean;
  canManageSavedViews: boolean;
}) {
  return (
    <Panel title="Saved views" description="Personal saved filters for the verification queue workspace.">
      {hasInvalidPayload ? (
        <p className={mutedTextClass}>
          One or more saved views have an unrecognised payload shape and cannot be applied. Default filters are used
          instead for those rows.
        </p>
      ) : null}
      <div className={stackClass}>
        {views.length === 0 ? (
          <p className={mutedTextClass}>
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
            <p className={mutedTextClass}>Note: these filters are saved with the view, but alerts do not use them.</p>
            <p className={monoMutedTextClass}>
              status={currentPayload.status ?? `-`}, stripeIdentityStatus={currentPayload.stripeIdentityStatus ?? `-`},
              country={currentPayload.country ?? `-`}, contractorKind={currentPayload.contractorKind ?? `-`},
              missingProfileData={currentPayload.missingProfileData === true ? `true` : `false`}, missingDocuments=
              {currentPayload.missingDocuments === true ? `true` : `false`}
            </p>
            <ActionPrimary type="submit">Save current view</ActionPrimary>
          </form>
        </article>
      ) : null}
    </Panel>
  );
}

export default async function VerificationQueuePage({
  searchParams,
}: {
  searchParams?: Promise<{
    quickstart?: string;
    page?: string;
    status?: string;
    stripeIdentityStatus?: string;
    country?: string;
    contractorKind?: string;
    missingProfileData?: string;
    missingDocuments?: string;
  }>;
}) {
  const params = await searchParams;
  const identity = await getAdminIdentity();
  const canManageSavedViews = identity?.capabilities.includes(`saved_views.manage`) ?? false;
  const page = params?.page ? Number(params.page) : 1;
  const requestedQuickstartId = parseQuickstartId(params?.quickstart);
  const resolvedQuickstart = requestedQuickstartId ? await getQuickstart(requestedQuickstartId) : null;
  const appliedQuickstart = resolvedQuickstart?.targetPath === `/verification` ? resolvedQuickstart : null;
  const status = params?.status?.trim() || appliedQuickstart?.filters.status || undefined;
  const stripeIdentityStatus =
    params?.stripeIdentityStatus?.trim() || appliedQuickstart?.filters.stripeIdentityStatus || undefined;
  const country = params?.country?.trim() || appliedQuickstart?.filters.country || undefined;
  const contractorKind = params?.contractorKind?.trim() || appliedQuickstart?.filters.contractorKind || undefined;
  const missingProfileData =
    params?.missingProfileData === `true` ||
    (params?.missingProfileData == null && appliedQuickstart?.filters.missingProfileData === true);
  const missingDocuments =
    params?.missingDocuments === `true` ||
    (params?.missingDocuments == null && appliedQuickstart?.filters.missingDocuments === true);

  const [queue, savedViewsResponse] = await Promise.all([
    getVerificationQueue({
      page,
      status,
      stripeIdentityStatus,
      country,
      contractorKind,
      missingProfileData,
      missingDocuments,
    }),
    canManageSavedViews ? getSavedViews({ workspace: SAVED_VIEW_WORKSPACE }) : Promise.resolve(null),
  ]);

  const totalPages = queue ? Math.max(1, Math.ceil(queue.total / queue.pageSize)) : 1;
  const savedViews = savedViewsResponse?.views ?? [];
  const hasInvalidPayload = savedViews.some((view) => parseSavedViewPayload(view.queryPayload) === null);
  const items = queue?.items ?? [];
  const currentQueueHref = buildPathWithSearch(`/verification`, {
    quickstart: requestedQuickstartId,
    page,
    status,
    stripeIdentityStatus,
    country,
    contractorKind,
    missingProfileData: missingProfileData ? `true` : undefined,
    missingDocuments: missingDocuments ? `true` : undefined,
  });

  const currentPayload: VerificationQueueSavedViewPayload = {
    status,
    stripeIdentityStatus,
    country,
    contractorKind,
    missingProfileData: missingProfileData ? true : undefined,
    missingDocuments: missingDocuments ? true : undefined,
  };

  function buildHref(next: { payload?: VerificationQueueSavedViewPayload | null; page?: number }): string {
    const query = new URLSearchParams();
    if (next.payload) {
      appendPayloadToQuery(query, next.payload);
    }
    if (next.page !== undefined) {
      query.set(`page`, String(next.page));
    }
    return `/verification?${query.toString()}`;
  }

  function pageHref(nextPage: number) {
    const query = new URLSearchParams();
    if (requestedQuickstartId) query.set(`quickstart`, requestedQuickstartId);
    if (status) query.set(`status`, status);
    if (stripeIdentityStatus) query.set(`stripeIdentityStatus`, stripeIdentityStatus);
    if (country) query.set(`country`, country);
    if (contractorKind) query.set(`contractorKind`, contractorKind);
    if (missingProfileData) query.set(`missingProfileData`, `true`);
    if (missingDocuments) query.set(`missingDocuments`, `true`);
    query.set(`page`, String(nextPage));
    return `/verification?${query.toString()}`;
  }

  return (
    <WorkspaceLayout workspace="verification">
      <>
        <Panel
          title="Verification Queue"
          description="Verification queue for active review states: PENDING, MORE_INFO, and FLAGGED."
          actions={
            <p className={mutedTextClass}>
              SLA breached: {queue?.sla.breachedCount ?? 0} · threshold {queue?.sla.thresholdHours ?? 24}h
            </p>
          }
          surface="primary"
        />

        {appliedQuickstart ? (
          <Panel
            title={appliedQuickstart.label}
            description={appliedQuickstart.description}
            actions={<ActionGhost href="/verification">Remove quickstart</ActionGhost>}
            surface="support"
          />
        ) : params?.quickstart ? (
          <Panel surface="meta">
            <p className={mutedTextClass}>The requested quickstart could not be resolved for the verification queue.</p>
          </Panel>
        ) : null}

        <Panel
          title="Queue summary"
          description="See pressure and blockers for the current verification slice before opening filters."
          actions={
            <div className={buttonRowClass}>
              <TinyPill tone="cyan">{queue?.total ?? 0} total</TinyPill>
              <TinyPill>{queue?.sla.breachedCount ?? 0} breached</TinyPill>
              {missingDocuments ? <TinyPill>Missing docs</TinyPill> : null}
            </div>
          }
          surface="support"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Current slice</div>
              <div className="mt-2 text-sm text-white/90">
                {status ?? `All active statuses`}
                {country ? ` · ${country}` : ``}
                {contractorKind ? ` · ${contractorKind}` : ``}
              </div>
            </div>
            <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-white/40">Priority blocker</div>
              <div className="mt-2 text-sm text-white/90">
                {missingDocuments
                  ? `Document collection is explicitly filtered into this slice.`
                  : missingProfileData
                    ? `Profile completion gaps are explicitly filtered into this slice.`
                    : `Use filters to isolate missing profile or missing document cases.`}
              </div>
            </div>
            <div className="rounded-2xl border border-cyan-400/15 bg-cyan-500/[0.06] p-4">
              <div className="text-[11px] uppercase tracking-[0.18em] text-cyan-200/70">Next step</div>
              <div className="mt-2 text-sm text-white/92">
                Open the case list below and continue with the next review.
              </div>
            </div>
          </div>
        </Panel>

        <SavedViewsSection
          views={savedViews}
          currentPayload={currentPayload}
          buildHref={buildHref}
          hasInvalidPayload={hasInvalidPayload}
          canManageSavedViews={canManageSavedViews}
        />

        <ResponsiveFilterPanel
          title="Queue filters"
          description="Refine the active verification review list without leaving the workspace."
          summaryLabel="Filters"
          summaryValue={`${
            [
              status,
              stripeIdentityStatus,
              country,
              contractorKind,
              missingProfileData ? `missing profile` : ``,
              missingDocuments ? `missing docs` : ``,
            ].filter(Boolean).length
          } active`}
        >
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" method="get">
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Verification status</span>
              <input className={textInputClass} name="status" defaultValue={status ?? ``} placeholder="status" />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Stripe status</span>
              <input
                className={textInputClass}
                name="stripeIdentityStatus"
                defaultValue={stripeIdentityStatus ?? ``}
                placeholder="stripe status"
              />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Country</span>
              <input className={textInputClass} name="country" defaultValue={country ?? ``} placeholder="country" />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Contractor kind</span>
              <input
                className={textInputClass}
                name="contractorKind"
                defaultValue={contractorKind ?? ``}
                placeholder="contractor kind"
              />
            </label>
            <div className="flex flex-col justify-end gap-3 xl:col-span-2">
              <div className={buttonRowClass}>
                <label className={checkboxFieldClass}>
                  <input
                    className={checkboxInputClass}
                    type="checkbox"
                    name="missingProfileData"
                    value="true"
                    defaultChecked={missingProfileData}
                  />
                  <span>Missing profile</span>
                </label>
                <label className={checkboxFieldClass}>
                  <input
                    className={checkboxInputClass}
                    type="checkbox"
                    name="missingDocuments"
                    value="true"
                    defaultChecked={missingDocuments}
                  />
                  <span>Missing docs</span>
                </label>
              </div>
              <div className={buttonRowClass}>
                <ActionGhost type="submit">Apply</ActionGhost>
                <ActionGhost href="/verification">Reset</ActionGhost>
              </div>
            </div>
          </form>
        </ResponsiveFilterPanel>

        <Panel
          title="Verification cases"
          description={`${queue?.total ?? 0} results · page ${queue?.page ?? 1} / ${totalPages}`}
          actions={
            <div className={buttonRowClass}>
              <a
                className={cn(page <= 1 && `pointer-events-none opacity-50`, ghostButtonClass)}
                href={page > 1 ? pageHref(page - 1) : pageHref(1)}
              >
                Previous
              </a>
              <a
                className={cn(page >= totalPages && `pointer-events-none opacity-50`, ghostButtonClass)}
                href={page < totalPages ? pageHref(page + 1) : pageHref(totalPages)}
              >
                Next
              </a>
            </div>
          }
          surface="support"
        >
          <VerificationMobileCards items={items} returnTo={currentQueueHref} />
          <VerificationTabletRows items={items} returnTo={currentQueueHref} />
          <VerificationDesktopTable items={items} returnTo={currentQueueHref} />
        </Panel>
      </>
    </WorkspaceLayout>
  );
}
