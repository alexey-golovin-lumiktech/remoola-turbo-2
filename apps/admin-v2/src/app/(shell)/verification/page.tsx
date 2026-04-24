import Link from 'next/link';

import { cn } from '@remoola/ui';

import { ActionGhost } from '../../../components/action-ghost';
import { ActionPrimary } from '../../../components/action-primary';
import { DenseTable } from '../../../components/dense-table';
import { MobileQueueCard } from '../../../components/mobile-queue-card';
import { Panel } from '../../../components/panel';
import { StatusPill } from '../../../components/status-pill';
import { TabletRow } from '../../../components/tablet-row';
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
  getQuickstart,
  getSavedViews,
  getVerificationQueue,
  type SavedViewSummary,
} from '../../../lib/admin-api.server';
import {
  createSavedViewAction,
  deleteSavedViewAction,
  updateSavedViewAction,
} from '../../../lib/admin-mutations.server';
import { parseQuickstartId } from '../../../lib/quickstart-investigations';

const SAVED_VIEW_WORKSPACE = `verification_queue` as const;
const MAX_SAVED_VIEW_NAME_LENGTH = 100;
const MAX_SAVED_VIEW_DESCRIPTION_LENGTH = 500;

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

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

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

function VerificationMobileCards({ items }: { items: VerificationItem[] }) {
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
            href={`/verification/${item.id}`}
            title={item.email}
            subtitle={item.id}
            trailing={<StatusPill status={item.verificationStatus} />}
          >
            <div className={mutedTextClass}>Stripe: {item.stripeIdentityStatus ?? `-`}</div>
            <div>
              {item.accountType} · {item.country ?? `-`}
            </div>
            <div className={mutedTextClass}>{item.missingProfileData ? `Missing profile data` : `Profile ready`}</div>
            <div className={mutedTextClass}>
              {item.missingDocuments ? `Missing documents` : `${item.documentsCount} attached`}
            </div>
            <div className={mutedTextClass}>SLA: {item.slaBreached ? `Breached` : `Within SLA`}</div>
            <div className={mutedTextClass}>Assigned: {renderVerificationAssigneeSummary(item)}</div>
            <div className={mutedTextClass}>Updated: {formatDate(item.updatedAt)}</div>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function VerificationTabletRows({ items }: { items: VerificationItem[] }) {
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
                <Link href={`/verification/${item.id}`}>
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
                <div className={mutedTextClass}>{formatDate(item.updatedAt)}</div>
              </div>,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function VerificationDesktopTable({ items }: { items: VerificationItem[] }) {
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
                  <Link href={`/verification/${item.id}`}>{item.email}</Link>
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
                <td>{formatDate(item.updatedAt)}</td>
              </tr>
            ))}
      </DenseTable>
    </div>
  );
}

function SavedViewRow({ view, buildHref }: { view: SavedViewSummary; buildHref: BuildHrefFn }) {
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
          <form action={deleteSavedViewAction.bind(null, view.id)}>
            <input type="hidden" name="workspace" value={view.workspace} />
            <button className={dangerButtonClass} type="submit">
              Delete
            </button>
          </form>
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
              maxLength={MAX_SAVED_VIEW_NAME_LENGTH}
              aria-label="Saved view name"
            />
          </label>
          <label className={fieldClass}>
            <span className={fieldLabelClass}>Description</span>
            <input
              className={textInputClass}
              name="description"
              defaultValue={view.description ?? ``}
              maxLength={MAX_SAVED_VIEW_DESCRIPTION_LENGTH}
              aria-label="Saved view description"
            />
          </label>
          <ActionGhost type="submit">Save changes</ActionGhost>
        </form>
      </details>
    </Panel>
  );
}

function SavedViewsSection({
  views,
  currentPayload,
  buildHref,
  hasInvalidPayload,
}: {
  views: SavedViewSummary[];
  currentPayload: VerificationQueueSavedViewPayload;
  buildHref: BuildHrefFn;
  hasInvalidPayload: boolean;
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
          <p className={mutedTextClass}>No saved views yet. Use the form below to save the current filters.</p>
        ) : (
          views.map((view) => <SavedViewRow key={view.id} view={view} buildHref={buildHref} />)
        )}
      </div>
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
              maxLength={MAX_SAVED_VIEW_NAME_LENGTH}
              placeholder="e.g. Pending DE individuals"
              aria-label="New saved view name"
            />
          </label>
          <label className={fieldClass}>
            <span className={fieldLabelClass}>Description</span>
            <input
              className={textInputClass}
              name="description"
              maxLength={MAX_SAVED_VIEW_DESCRIPTION_LENGTH}
              placeholder="Optional"
              aria-label="New saved view description"
            />
          </label>
          <p className={mutedTextClass}>
            Note: filters <code>missingProfileData</code> and <code>missingDocuments</code> are saved but cannot be used
            by alert evaluation (frontend-only filters).
          </p>
          <p className={monoMutedTextClass}>
            status={currentPayload.status ?? `-`}, stripeIdentityStatus={currentPayload.stripeIdentityStatus ?? `-`},
            country={currentPayload.country ?? `-`}, contractorKind={currentPayload.contractorKind ?? `-`},
            missingProfileData={currentPayload.missingProfileData === true ? `true` : `false`}, missingDocuments=
            {currentPayload.missingDocuments === true ? `true` : `false`}
          </p>
          <ActionPrimary type="submit">Save current view</ActionPrimary>
        </form>
      </article>
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
    getSavedViews({ workspace: SAVED_VIEW_WORKSPACE }),
  ]);

  const totalPages = queue ? Math.max(1, Math.ceil(queue.total / queue.pageSize)) : 1;
  const savedViews = savedViewsResponse?.views ?? [];
  const hasInvalidPayload = savedViews.some((view) => parseSavedViewPayload(view.queryPayload) === null);
  const items = queue?.items ?? [];

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
          description="Verification queue for canonical review states: PENDING, MORE_INFO and FLAGGED."
          actions={
            <p className={mutedTextClass}>
              SLA breached: {queue?.sla.breachedCount ?? 0} · threshold {queue?.sla.thresholdHours ?? 24}h
            </p>
          }
        />

        {appliedQuickstart ? (
          <Panel
            title={appliedQuickstart.label}
            description={appliedQuickstart.description}
            actions={<ActionGhost href="/verification">Remove quickstart</ActionGhost>}
          />
        ) : params?.quickstart ? (
          <Panel>
            <p className={mutedTextClass}>The requested quickstart could not be resolved for the verification queue.</p>
          </Panel>
        ) : null}

        <SavedViewsSection
          views={savedViews}
          currentPayload={currentPayload}
          buildHref={buildHref}
          hasInvalidPayload={hasInvalidPayload}
        />

        <Panel>
          <form className={buttonRowClass} method="get">
            <input className={textInputClass} name="status" defaultValue={status ?? ``} placeholder="status" />
            <input
              className={textInputClass}
              name="stripeIdentityStatus"
              defaultValue={stripeIdentityStatus ?? ``}
              placeholder="stripe status"
            />
            <input className={textInputClass} name="country" defaultValue={country ?? ``} placeholder="country" />
            <input
              className={textInputClass}
              name="contractorKind"
              defaultValue={contractorKind ?? ``}
              placeholder="contractor kind"
            />
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
            <ActionGhost type="submit">Apply</ActionGhost>
          </form>
        </Panel>

        <Panel
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
        >
          <p className={mutedTextClass}>
            {queue?.total ?? 0} results · page {queue?.page ?? 1} / {totalPages}
          </p>
          <VerificationMobileCards items={items} />
          <VerificationTabletRows items={items} />
          <VerificationDesktopTable items={items} />
        </Panel>
      </>
    </WorkspaceLayout>
  );
}
