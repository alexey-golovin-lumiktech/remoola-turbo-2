import Link from 'next/link';

import { getSavedViews, getVerificationQueue, type SavedViewSummary } from '../../../lib/admin-api.server';
import {
  createSavedViewAction,
  deleteSavedViewAction,
  updateSavedViewAction,
} from '../../../lib/admin-mutations.server';

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

function SavedViewRow({ view, buildHref }: { view: SavedViewSummary; buildHref: BuildHrefFn }) {
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
            <Link className="secondaryButton" href={buildHref({ payload, page: 1 })}>
              Apply
            </Link>
          ) : (
            <Link className="secondaryButton" href={buildHref({ payload: null, page: 1 })} aria-disabled="true">
              Use defaults
            </Link>
          )}
          <form action={deleteSavedViewAction.bind(null, view.id)}>
            <input type="hidden" name="workspace" value={view.workspace} />
            <button className="dangerButton" type="submit">
              Delete
            </button>
          </form>
        </div>
      </div>
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
              maxLength={MAX_SAVED_VIEW_NAME_LENGTH}
              aria-label="Saved view name"
            />
          </label>
          <label className="field">
            <span>Description</span>
            <input
              name="description"
              defaultValue={view.description ?? ``}
              maxLength={MAX_SAVED_VIEW_DESCRIPTION_LENGTH}
              aria-label="Saved view description"
            />
          </label>
          <button className="secondaryButton" type="submit">
            Save changes
          </button>
        </form>
      </details>
    </div>
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
    <section className="panel" aria-label="Saved views">
      <div className="pageHeader">
        <div>
          <h2>Saved views</h2>
          <p className="muted">Personal saved filters for the verification queue workspace.</p>
        </div>
      </div>
      {hasInvalidPayload ? (
        <p className="muted">
          One or more saved views have an unrecognised payload shape and cannot be applied. Default filters are used
          instead for those rows.
        </p>
      ) : null}
      <div className="formStack">
        {views.length === 0 ? (
          <p className="muted">No saved views yet. Use the form below to save the current filters.</p>
        ) : (
          views.map((view) => <SavedViewRow key={view.id} view={view} buildHref={buildHref} />)
        )}
      </div>
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
              maxLength={MAX_SAVED_VIEW_NAME_LENGTH}
              placeholder="e.g. Pending DE individuals"
              aria-label="New saved view name"
            />
          </label>
          <label className="field">
            <span>Description</span>
            <input
              name="description"
              maxLength={MAX_SAVED_VIEW_DESCRIPTION_LENGTH}
              placeholder="Optional"
              aria-label="New saved view description"
            />
          </label>
          <p className="muted">
            Note: filters <code>missingProfileData</code> and <code>missingDocuments</code> are saved but cannot be used
            by alert evaluation (frontend-only filters).
          </p>
          <p className="muted mono">
            status={currentPayload.status ?? `-`}, stripeIdentityStatus={currentPayload.stripeIdentityStatus ?? `-`},
            country={currentPayload.country ?? `-`}, contractorKind={currentPayload.contractorKind ?? `-`},
            missingProfileData={currentPayload.missingProfileData === true ? `true` : `false`}, missingDocuments=
            {currentPayload.missingDocuments === true ? `true` : `false`}
          </p>
          <button className="primaryButton" type="submit">
            Save current view
          </button>
        </form>
      </article>
    </section>
  );
}

export default async function VerificationQueuePage({
  searchParams,
}: {
  searchParams?: Promise<{
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

  const [queue, savedViewsResponse] = await Promise.all([
    getVerificationQueue({
      page,
      status: params?.status,
      stripeIdentityStatus: params?.stripeIdentityStatus,
      country: params?.country,
      contractorKind: params?.contractorKind,
      missingProfileData: params?.missingProfileData === `true`,
      missingDocuments: params?.missingDocuments === `true`,
    }),
    getSavedViews({ workspace: SAVED_VIEW_WORKSPACE }),
  ]);

  const totalPages = queue ? Math.max(1, Math.ceil(queue.total / queue.pageSize)) : 1;
  const savedViews = savedViewsResponse?.views ?? [];
  const hasInvalidPayload = savedViews.some((view) => parseSavedViewPayload(view.queryPayload) === null);

  const currentPayload: VerificationQueueSavedViewPayload = {
    status: params?.status?.trim() || undefined,
    stripeIdentityStatus: params?.stripeIdentityStatus?.trim() || undefined,
    country: params?.country?.trim() || undefined,
    contractorKind: params?.contractorKind?.trim() || undefined,
    missingProfileData: params?.missingProfileData === `true` ? true : undefined,
    missingDocuments: params?.missingDocuments === `true` ? true : undefined,
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
    if (params?.status?.trim()) query.set(`status`, params.status.trim());
    if (params?.stripeIdentityStatus?.trim()) query.set(`stripeIdentityStatus`, params.stripeIdentityStatus.trim());
    if (params?.country?.trim()) query.set(`country`, params.country.trim());
    if (params?.contractorKind?.trim()) query.set(`contractorKind`, params.contractorKind.trim());
    if (params?.missingProfileData === `true`) query.set(`missingProfileData`, `true`);
    if (params?.missingDocuments === `true`) query.set(`missingDocuments`, `true`);
    query.set(`page`, String(nextPage));
    return `/verification?${query.toString()}`;
  }

  return (
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Verification Queue</h1>
          <p className="muted">Verification queue for canonical review states: PENDING, MORE_INFO and FLAGGED.</p>
        </div>
        <p className="muted">
          SLA breached: {queue?.sla.breachedCount ?? 0} · threshold {queue?.sla.thresholdHours ?? 24}h
        </p>
      </section>

      <SavedViewsSection
        views={savedViews}
        currentPayload={currentPayload}
        buildHref={buildHref}
        hasInvalidPayload={hasInvalidPayload}
      />

      <section className="panel pageHeader">
        <form className="actionsRow" method="get">
          <input name="status" defaultValue={params?.status ?? ``} placeholder="status" />
          <input
            name="stripeIdentityStatus"
            defaultValue={params?.stripeIdentityStatus ?? ``}
            placeholder="stripe status"
          />
          <input name="country" defaultValue={params?.country ?? ``} placeholder="country" />
          <input name="contractorKind" defaultValue={params?.contractorKind ?? ``} placeholder="contractor kind" />
          <label className="field">
            <span>Missing profile</span>
            <input
              type="checkbox"
              name="missingProfileData"
              value="true"
              defaultChecked={params?.missingProfileData === `true`}
            />
          </label>
          <label className="field">
            <span>Missing docs</span>
            <input
              type="checkbox"
              name="missingDocuments"
              value="true"
              defaultChecked={params?.missingDocuments === `true`}
            />
          </label>
          <button className="secondaryButton" type="submit">
            Apply
          </button>
        </form>
      </section>

      <section className="panel tableWrap">
        <div className="pageHeader">
          <p className="muted">
            {queue?.total ?? 0} results · page {queue?.page ?? 1} / {totalPages}
          </p>
          <div className="actionsRow">
            <a className="secondaryButton" aria-disabled={page <= 1} href={page > 1 ? pageHref(page - 1) : pageHref(1)}>
              Previous
            </a>
            <a
              className="secondaryButton"
              aria-disabled={page >= totalPages}
              href={page < totalPages ? pageHref(page + 1) : pageHref(totalPages)}
            >
              Next
            </a>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Consumer</th>
              <th>Status</th>
              <th>Profile</th>
              <th>Docs</th>
              <th>SLA</th>
              <th>Assigned to</th>
              <th>Updated</th>
            </tr>
          </thead>
          <tbody>
            {(queue?.items ?? []).map((item) => (
              <tr key={item.id}>
                <td>
                  <Link href={`/verification/${item.id}`}>{item.email}</Link>
                  <div className="muted mono">{item.id}</div>
                </td>
                <td>
                  {item.verificationStatus}
                  <div className="muted">{item.stripeIdentityStatus ?? `-`}</div>
                </td>
                <td>
                  {item.accountType}
                  <div className="muted">{item.country ?? `-`}</div>
                  <div className="muted">{item.missingProfileData ? `Missing profile data` : `Profile ready`}</div>
                </td>
                <td>{item.missingDocuments ? `Missing documents` : `${item.documentsCount} attached`}</td>
                <td>{item.slaBreached ? `Breached` : `Within SLA`}</td>
                <td>
                  {item.assignedTo ? (
                    <>
                      <div>{item.assignedTo.name ?? item.assignedTo.email ?? item.assignedTo.id}</div>
                      {item.assignedTo.email ? <div className="muted">{item.assignedTo.email}</div> : null}
                    </>
                  ) : (
                    <span className="muted">—</span>
                  )}
                </td>
                <td>{new Date(item.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}
