import { adminV2ConsumersListQuerySchema } from '@remoola/api-types';

import { ActionGhost } from '../../../components/action-ghost';
import { ContextStat } from '../../../components/context-stat';
import { Panel } from '../../../components/panel';
import {
  buttonRowClass,
  checkboxFieldClass,
  checkboxInputClass,
  fieldClass,
  fieldLabelClass,
  textInputClass,
} from '../../../components/ui-classes';
import { WorkspaceLayout } from '../../../components/workspace-layout';
import { ConsumersListView } from '../../../features/consumers/consumers-list-presenters';
import { getConsumers } from '../../../lib/admin-api/consumers.server';
import { buildPathWithSearch } from '../../../lib/navigation-context';
import { booleanSearchParam, positiveIntegerSearchParam, trimmedSearchParam } from '../../../lib/query-contract';

export default async function ConsumersPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    page?: string;
    accountType?: string;
    contractorKind?: string;
    verificationStatus?: string;
    includeDeleted?: string;
  }>;
}) {
  const params = await searchParams;
  const query = adminV2ConsumersListQuerySchema.parse({
    page: positiveIntegerSearchParam(params?.page, 1),
    q: trimmedSearchParam(params?.q),
    accountType: trimmedSearchParam(params?.accountType),
    contractorKind: trimmedSearchParam(params?.contractorKind),
    verificationStatus: trimmedSearchParam(params?.verificationStatus),
    includeDeleted: booleanSearchParam(params?.includeDeleted),
  });
  const page = query.page ?? 1;
  const q = query.q ?? ``;
  const accountType = query.accountType ?? ``;
  const contractorKind = query.contractorKind ?? ``;
  const verificationStatus = query.verificationStatus ?? ``;
  const includeDeleted = query.includeDeleted === true;
  const data = await getConsumers({ page, q, accountType, contractorKind, verificationStatus, includeDeleted });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const items = data?.items ?? [];
  const activeFilterCount = [
    q,
    accountType,
    contractorKind,
    verificationStatus,
    includeDeleted ? `deleted` : ``,
  ].filter(Boolean).length;

  function pageHref(nextPage: number) {
    return buildPathWithSearch(`/consumers`, {
      q,
      accountType,
      contractorKind,
      verificationStatus,
      includeDeleted: includeDeleted ? `true` : undefined,
      page: nextPage,
    });
  }

  return (
    <WorkspaceLayout
      workspace="consumers"
      context={
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <ContextStat label="Matched" value={data?.total ?? 0} tone="cyan" />
            <ContextStat label="Visible" value={items.length} />
            <ContextStat label="Page" value={`${data?.page ?? 1}/${totalPages}`} />
            <ContextStat
              label="Active filters"
              value={activeFilterCount}
              tone={activeFilterCount > 0 ? `amber` : `neutral`}
            />
          </div>
          <div className="contextRailSection">
            <h4>Queue shortcuts</h4>
            <div className="contextRailLinks">
              <ActionGhost href="/verification">Verification queue</ActionGhost>
              <ActionGhost href="/payment-methods">Payment methods</ActionGhost>
              <ActionGhost href="/audit/consumer-actions">Consumer actions</ActionGhost>
            </div>
          </div>
        </>
      }
      contextTitle="Queue context"
      contextDescription="Current consumer queue volume, pagination, and nearby investigation paths."
    >
      <>
        <Panel
          eyebrow="Consumer queue"
          title="Consumers"
          description="Consumer investigation surface with notes, flags and audit drilldowns."
        >
          <form method="get" className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Search</span>
              <input className={textInputClass} name="q" defaultValue={q} placeholder="Search by email, name or id" />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Verification</span>
              <select className={textInputClass} name="verificationStatus" defaultValue={verificationStatus}>
                <option value="">All verification states</option>
                <option value="PENDING">PENDING</option>
                <option value="APPROVED">APPROVED</option>
                <option value="MORE_INFO">MORE_INFO</option>
                <option value="REJECTED">REJECTED</option>
                <option value="FLAGGED">FLAGGED</option>
              </select>
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Account type</span>
              <select className={textInputClass} name="accountType" defaultValue={accountType}>
                <option value="">All account types</option>
                <option value="BUSINESS">BUSINESS</option>
                <option value="CONTRACTOR">CONTRACTOR</option>
              </select>
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Contractor kind</span>
              <select className={textInputClass} name="contractorKind" defaultValue={contractorKind}>
                <option value="">All contractor kinds</option>
                <option value="ENTITY">ENTITY</option>
                <option value="INDIVIDUAL">INDIVIDUAL</option>
              </select>
            </label>
            <div className="flex flex-col justify-end gap-3">
              <label className={checkboxFieldClass}>
                <input
                  className={checkboxInputClass}
                  name="includeDeleted"
                  type="checkbox"
                  value="true"
                  defaultChecked={includeDeleted}
                />
                <span>Include deleted</span>
              </label>
              <div className={buttonRowClass}>
                <ActionGhost type="submit">Apply</ActionGhost>
                <ActionGhost href="/consumers">Reset</ActionGhost>
              </div>
            </div>
          </form>
        </Panel>

        <Panel
          title="Consumer queue"
          description={`${data?.total ?? 0} results · page ${data?.page ?? 1} / ${totalPages}`}
          actions={
            <div className={buttonRowClass}>
              <ActionGhost ariaDisabled={page <= 1} href={page > 1 ? pageHref(page - 1) : pageHref(1)}>
                Previous
              </ActionGhost>
              <ActionGhost
                ariaDisabled={page >= totalPages}
                href={page < totalPages ? pageHref(page + 1) : pageHref(totalPages)}
              >
                Next
              </ActionGhost>
            </div>
          }
        >
          <ConsumersListView items={items} />
        </Panel>
      </>
    </WorkspaceLayout>
  );
}
