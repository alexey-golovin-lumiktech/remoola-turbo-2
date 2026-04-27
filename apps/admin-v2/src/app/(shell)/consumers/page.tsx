import Link from 'next/link';

import { ActionGhost } from '../../../components/action-ghost';
import { ContextStat } from '../../../components/context-stat';
import { DenseTable } from '../../../components/dense-table';
import { MobileQueueCard } from '../../../components/mobile-queue-card';
import { Panel } from '../../../components/panel';
import { StatusPill } from '../../../components/status-pill';
import { TabletRow } from '../../../components/tablet-row';
import {
  buttonRowClass,
  checkboxFieldClass,
  checkboxInputClass,
  fieldClass,
  fieldLabelClass,
  textInputClass,
} from '../../../components/ui-classes';
import { WorkspaceLayout } from '../../../components/workspace-layout';
import { getConsumers } from '../../../lib/admin-api.server';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

type ConsumerItem = NonNullable<Awaited<ReturnType<typeof getConsumers>>>[`items`][number];

function renderConsumerLabel(consumer: ConsumerItem) {
  return consumer.displayName ?? consumer.email ?? consumer.id;
}

function renderConsumerFlags(consumer: ConsumerItem) {
  if (consumer.adminFlags.length === 0) {
    return <span className="muted">No active flags</span>;
  }

  return (
    <div className="pillRow">
      {consumer.adminFlags.map((flag) => (
        <span key={flag.id} className="pill">
          {flag.flag}
        </span>
      ))}
    </div>
  );
}

function renderConsumerFlagsSummary(consumer: ConsumerItem): string {
  if (consumer.adminFlags.length === 0) {
    return `No active flags`;
  }

  return consumer.adminFlags.map((flag) => flag.flag).join(`, `);
}

function ConsumersMobileCards({ items }: { items: ConsumerItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className="panel muted">No consumers matched the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface md:hidden" data-view="mobile">
      <div className="queueCards">
        {items.map((consumer) => (
          <MobileQueueCard
            key={consumer.id}
            id={consumer.id}
            href={`/consumers/${consumer.id}`}
            eyebrow="Consumer case"
            title={renderConsumerLabel(consumer)}
            subtitle={consumer.email ?? `No email`}
            trailing={<StatusPill status={consumer.verificationStatus} />}
            badges={
              <>
                <span className="pill">{consumer.accountType}</span>
                {consumer.contractorKind ? <span className="pill">{consumer.contractorKind}</span> : null}
              </>
            }
          >
            <div className="muted mono">{consumer.id}</div>
            <div className="muted">{consumer.deletedAt ? `Deleted` : `Active`}</div>
            <div className="muted">Stripe identity: {consumer.stripeIdentityStatus ?? `No Stripe state`}</div>
            <div className="muted">Flags: {renderConsumerFlagsSummary(consumer)}</div>
            <div className="muted">Notes: {consumer._count.adminNotes}</div>
            <div className="muted">Updated: {formatDate(consumer.updatedAt)}</div>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function ConsumersTabletRows({ items }: { items: ConsumerItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className="panel muted">No consumers matched the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
      <div className="condensedList">
        {items.map((consumer) => (
          <TabletRow
            key={consumer.id}
            eyebrow="Consumer case"
            primary={
              <>
                <Link href={`/consumers/${consumer.id}`}>
                  <strong>{renderConsumerLabel(consumer)}</strong>
                </Link>
                <div className="muted">{consumer.email ?? `No email`}</div>
                <div className="muted mono">{consumer.id}</div>
              </>
            }
            badges={
              <>
                <StatusPill status={consumer.verificationStatus} />
                <span className="pill">{consumer.accountType}</span>
                {consumer.contractorKind ? <span className="pill">{consumer.contractorKind}</span> : null}
              </>
            }
            cells={[
              <div key="type">
                <div className="muted">{consumer.deletedAt ? `Deleted` : `Active`}</div>
              </div>,
              <div key="verification">
                <div className="muted">{consumer.stripeIdentityStatus ?? `No Stripe state`}</div>
              </div>,
              <div key="flags" className="muted">
                {renderConsumerFlagsSummary(consumer)}
              </div>,
              <div key="notes-updated">
                <div>{consumer._count.adminNotes} notes</div>
                <div className="muted">{formatDate(consumer.updatedAt)}</div>
              </div>,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function ConsumersDesktopTable({ items }: { items: ConsumerItem[] }) {
  return (
    <div className="readSurface hidden xl:block" data-view="desktop">
      <DenseTable
        headers={[`Consumer`, `Type`, `Verification`, `Flags`, `Notes`, `Updated`]}
        emptyMessage="No consumers matched the current filters."
      >
        {items.length === 0
          ? null
          : items.map((consumer) => (
              <tr key={consumer.id}>
                <td>
                  <Link href={`/consumers/${consumer.id}`}>
                    <strong>{renderConsumerLabel(consumer)}</strong>
                  </Link>
                  <div className="muted">{consumer.email ?? `No email`}</div>
                  <div className="muted mono">{consumer.id}</div>
                </td>
                <td>
                  <div>{consumer.accountType}</div>
                  <div className="muted">{consumer.contractorKind ?? `-`}</div>
                  <div className="muted">{consumer.deletedAt ? `Deleted` : `Active`}</div>
                </td>
                <td>
                  <div>
                    <StatusPill status={consumer.verificationStatus} />
                  </div>
                  <div className="muted">{consumer.stripeIdentityStatus ?? `No Stripe state`}</div>
                </td>
                <td>{renderConsumerFlags(consumer)}</td>
                <td>{consumer._count.adminNotes}</td>
                <td>{formatDate(consumer.updatedAt)}</td>
              </tr>
            ))}
      </DenseTable>
    </div>
  );
}

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
  const page = params?.page ? Number(params.page) : 1;
  const q = params?.q?.trim() ?? ``;
  const accountType = params?.accountType?.trim() ?? ``;
  const contractorKind = params?.contractorKind?.trim() ?? ``;
  const verificationStatus = params?.verificationStatus?.trim() ?? ``;
  const includeDeleted = params?.includeDeleted === `true`;
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
    const query = new URLSearchParams();
    if (q) query.set(`q`, q);
    if (accountType) query.set(`accountType`, accountType);
    if (contractorKind) query.set(`contractorKind`, contractorKind);
    if (verificationStatus) query.set(`verificationStatus`, verificationStatus);
    if (includeDeleted) query.set(`includeDeleted`, `true`);
    query.set(`page`, String(nextPage));
    return `/consumers?${query.toString()}`;
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
          <ConsumersMobileCards items={items} />
          <ConsumersTabletRows items={items} />
          <ConsumersDesktopTable items={items} />
        </Panel>
      </>
    </WorkspaceLayout>
  );
}
