import { type AdminV2VerificationQueuePayload, adminV2VerificationQueueQuerySchema } from '@remoola/api-types';
import { cn } from '@remoola/ui';

import { ActionGhost } from '../../../components/action-ghost';
import { ContextStat } from '../../../components/context-stat';
import { Panel } from '../../../components/panel';
import { ResponsiveFilterPanel } from '../../../components/responsive-filter-panel';
import { TinyPill } from '../../../components/tiny-pill';
import {
  buttonRowClass,
  checkboxFieldClass,
  checkboxInputClass,
  fieldClass,
  fieldLabelClass,
  mutedTextClass,
  textInputClass,
} from '../../../components/ui-classes';
import { WorkspaceLayout } from '../../../components/workspace-layout';
import {
  SavedViewsSection,
  VerificationDesktopTable,
  VerificationMobileCards,
  VerificationTabletRows,
  ghostButtonClass,
} from '../../../features/verification/verification-queue-presenters';
import { getAdminIdentity } from '../../../lib/admin-api/identity.server';
import { getQuickstart, getSavedViews } from '../../../lib/admin-api/overview.server';
import { getVerificationQueue } from '../../../lib/admin-api/verification.server';
import { parseVerificationQueuePayload } from '../../../lib/admin-surface-payloads';
import { buildPathWithSearch } from '../../../lib/navigation-context';
import {
  booleanSearchParam,
  positiveIntegerSearchParam,
  type SearchParamValue,
  trimmedSearchParam,
} from '../../../lib/query-contract';
import { parseQuickstartId } from '../../../lib/quickstart-investigations';

const SAVED_VIEW_WORKSPACE = `verification_queue` as const;

export default async function VerificationQueuePage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, SearchParamValue>>;
}) {
  const params = await searchParams;
  const identity = await getAdminIdentity();
  const canManageSavedViews = identity?.capabilities.includes(`saved_views.manage`) ?? false;
  const requestedQuickstartId = parseQuickstartId(trimmedSearchParam(params?.quickstart));
  const resolvedQuickstart = requestedQuickstartId ? await getQuickstart(requestedQuickstartId) : null;
  const appliedQuickstart = resolvedQuickstart?.targetPath === `/verification` ? resolvedQuickstart : null;
  const query = adminV2VerificationQueueQuerySchema.parse({
    page: positiveIntegerSearchParam(params?.page, 1),
    status: trimmedSearchParam(params?.status) || appliedQuickstart?.filters.status,
    stripeIdentityStatus:
      trimmedSearchParam(params?.stripeIdentityStatus) || appliedQuickstart?.filters.stripeIdentityStatus,
    country: trimmedSearchParam(params?.country) || appliedQuickstart?.filters.country,
    contractorKind: trimmedSearchParam(params?.contractorKind) || appliedQuickstart?.filters.contractorKind,
    missingProfileData:
      booleanSearchParam(params?.missingProfileData) ??
      (params?.missingProfileData == null && appliedQuickstart?.filters.missingProfileData === true ? true : undefined),
    missingDocuments:
      booleanSearchParam(params?.missingDocuments) ??
      (params?.missingDocuments == null && appliedQuickstart?.filters.missingDocuments === true ? true : undefined),
  });
  const page = query.page ?? 1;
  const status = query.status;
  const stripeIdentityStatus = query.stripeIdentityStatus;
  const country = query.country;
  const contractorKind = query.contractorKind;
  const missingProfileData = query.missingProfileData === true;
  const missingDocuments = query.missingDocuments === true;

  const [queue, savedViewsResponse] = await Promise.all([
    getVerificationQueue({
      page,
      status,
      stripeIdentityStatus,
      country,
      contractorKind,
      missingProfileData: missingProfileData ? true : undefined,
      missingDocuments: missingDocuments ? true : undefined,
    }),
    canManageSavedViews ? getSavedViews({ workspace: SAVED_VIEW_WORKSPACE }) : Promise.resolve(null),
  ]);

  const totalPages = queue ? Math.max(1, Math.ceil(queue.total / queue.pageSize)) : 1;
  const savedViews = savedViewsResponse?.views ?? [];
  const hasInvalidPayload = savedViews.some((view) => parseVerificationQueuePayload(view.queryPayload) === null);
  const items = queue?.items ?? [];
  const activeFilterCount = [
    status,
    stripeIdentityStatus,
    country,
    contractorKind,
    missingProfileData ? `missing profile` : ``,
    missingDocuments ? `missing docs` : ``,
  ].filter(Boolean).length;
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

  const currentPayload: AdminV2VerificationQueuePayload = {
    status,
    stripeIdentityStatus,
    country,
    contractorKind,
    missingProfileData: missingProfileData ? true : undefined,
    missingDocuments: missingDocuments ? true : undefined,
  };

  function buildHref(next: { payload?: AdminV2VerificationQueuePayload | null; page?: number }): string {
    return buildPathWithSearch(`/verification`, {
      page: next.page,
      status: next.payload?.status,
      stripeIdentityStatus: next.payload?.stripeIdentityStatus,
      country: next.payload?.country,
      contractorKind: next.payload?.contractorKind,
      missingProfileData: next.payload?.missingProfileData ? `true` : undefined,
      missingDocuments: next.payload?.missingDocuments ? `true` : undefined,
    });
  }

  function pageHref(nextPage: number) {
    return buildPathWithSearch(`/verification`, {
      quickstart: requestedQuickstartId,
      page: nextPage,
      status,
      stripeIdentityStatus,
      country,
      contractorKind,
      missingProfileData: missingProfileData ? `true` : undefined,
      missingDocuments: missingDocuments ? `true` : undefined,
    });
  }

  return (
    <WorkspaceLayout
      workspace="verification"
      context={
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <ContextStat label="Total in queue" value={queue?.total ?? 0} tone="cyan" />
            <ContextStat
              label="SLA breached"
              value={queue?.sla.breachedCount ?? 0}
              tone={(queue?.sla.breachedCount ?? 0) > 0 ? `rose` : `emerald`}
            />
            <ContextStat
              label="Active filters"
              value={activeFilterCount}
              tone={activeFilterCount > 0 ? `amber` : `neutral`}
            />
            <ContextStat label="Saved views" value={savedViews.length} />
          </div>
          <div className="contextRailSection">
            <h4>Queue shortcuts</h4>
            <div className="contextRailLinks">
              <ActionGhost href="/consumers">Consumer queue</ActionGhost>
              <ActionGhost href="/documents">Documents</ActionGhost>
              <ActionGhost href="/audit/admin-actions">Admin actions</ActionGhost>
            </div>
          </div>
        </>
      }
      contextTitle="Queue context"
      contextDescription="Live verification volume, SLA pressure, and shortcuts around the current review slice."
    >
      <>
        <Panel
          eyebrow="Verification queue"
          title="Verification Queue"
          description="Verification queue for active review states: PENDING, MORE_INFO, and FLAGGED."
          actions={
            <div className={buttonRowClass}>
              <TinyPill tone="cyan">{queue?.total ?? 0} total</TinyPill>
              <TinyPill>{queue?.sla.breachedCount ?? 0} breached</TinyPill>
              <TinyPill>
                {activeFilterCount > 0 ? `${activeFilterCount} filters active` : `All active statuses`}
              </TinyPill>
            </div>
          }
          surface="primary"
        >
          <p className={mutedTextClass}>
            SLA breached: {queue?.sla.breachedCount ?? 0} · threshold {queue?.sla.thresholdHours ?? 24}h
            {missingDocuments ? ` · document collection prioritized` : ``}
            {missingProfileData ? ` · profile gaps prioritized` : ``}
          </p>
        </Panel>

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

        <ResponsiveFilterPanel
          className="order-3"
          title="Queue filters"
          description="Refine the active verification review list without leaving the workspace."
          summaryLabel="Filters"
          summaryValue={`${activeFilterCount} active`}
          activeCount={activeFilterCount}
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
          className="order-2"
          title="Verification cases"
          description={`${queue?.total ?? 0} results · page ${queue?.page ?? 1} / ${totalPages} · ${
            status ?? `All active statuses`
          }`}
          actions={
            <div className={buttonRowClass}>
              {missingDocuments ? <TinyPill>Missing docs</TinyPill> : null}
              {missingProfileData ? <TinyPill>Missing profile</TinyPill> : null}
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

        <SavedViewsSection
          views={savedViews}
          currentPayload={currentPayload}
          buildHref={buildHref}
          hasInvalidPayload={hasInvalidPayload}
          canManageSavedViews={canManageSavedViews}
        />
      </>
    </WorkspaceLayout>
  );
}
