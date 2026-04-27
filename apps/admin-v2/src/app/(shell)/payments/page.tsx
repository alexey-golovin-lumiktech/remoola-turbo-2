import Link from 'next/link';

import { ActionGhost } from '../../../components/action-ghost';
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
  emptyPanelClass,
  fieldClass,
  fieldLabelClass,
  mutedTextClass,
  subtleTextClass,
  textInputClass,
} from '../../../components/ui-classes';
import { WorkspaceLayout } from '../../../components/workspace-layout';
import { getPayments, getQuickstart, type PaymentsListResponse } from '../../../lib/admin-api.server';
import { buildPathWithSearch, withReturnTo } from '../../../lib/navigation-context';
import { parseQuickstartId } from '../../../lib/quickstart-investigations';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

type PaymentItem = PaymentsListResponse[`items`][number];

function renderConsumerLabel(consumer: PaymentItem[`payer`] | PaymentItem[`requester`]): string {
  return consumer.email ?? consumer.id ?? `Unknown consumer`;
}

function renderConsumerLink(consumer: PaymentItem[`payer`] | PaymentItem[`requester`], returnTo: string) {
  if (consumer.id) {
    return <Link href={withReturnTo(`/consumers/${consumer.id}`, returnTo)}>{consumer.email ?? consumer.id}</Link>;
  }

  return consumer.email ?? `-`;
}

function PaymentParticipants({ item, returnTo }: { item: PaymentItem; returnTo: string }) {
  return (
    <>
      <div>Payer: {renderConsumerLink(item.payer, returnTo)}</div>
      <div>Requester: {renderConsumerLink(item.requester, returnTo)}</div>
    </>
  );
}

function PaymentParticipantsSummary({ item, returnTo }: { item: PaymentItem; returnTo: string }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm text-white/90">Payer: {renderConsumerLink(item.payer, returnTo)}</div>
      <div className="truncate text-sm text-white/72">Requester: {renderConsumerLink(item.requester, returnTo)}</div>
    </div>
  );
}

function PaymentQueueHeading({ item }: { item: PaymentItem }) {
  return (
    <div className="min-w-0">
      <div className="truncate text-sm text-white/95">{renderConsumerLabel(item.payer)}</div>
      <div className="truncate text-xs text-white/56">Requester: {renderConsumerLabel(item.requester)}</div>
    </div>
  );
}

function PaymentAssignedTo({ item }: { item: PaymentItem }) {
  if (!item.assignedTo) {
    return <span className={mutedTextClass}>—</span>;
  }

  return (
    <>
      <span>{item.assignedTo.name ?? item.assignedTo.email ?? item.assignedTo.id}</span>
      {item.assignedTo.email ? <span className={mutedTextClass}> {item.assignedTo.email}</span> : null}
    </>
  );
}

function shouldShowPersistedStatus(item: PaymentItem): boolean {
  return item.persistedStatus !== item.effectiveStatus;
}

function shouldShowFreshnessLabel(item: PaymentItem): boolean {
  return item.staleWarning || item.dataFreshnessClass !== `exact`;
}

function PaymentsMobileCards({ items, returnTo }: { items: PaymentItem[]; returnTo: string }) {
  if (items.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className={emptyPanelClass}>No payment requests found for the current filters.</div>
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
            href={withReturnTo(`/payments/${item.id}`, returnTo)}
            eyebrow="Payment request"
            title={<PaymentQueueHeading item={item} />}
            subtitle={item.id}
            trailing={
              <>
                {item.amount} {item.currencyCode}
              </>
            }
            badges={
              <>
                <StatusPill status={item.effectiveStatus} />
                {item.paymentRail ? <TinyPill>{item.paymentRail}</TinyPill> : null}
              </>
            }
          >
            <MobileQueueSection title="Queue summary">
              <div className={mutedTextClass}>
                Assigned: <PaymentAssignedTo item={item} />
              </div>
              {shouldShowPersistedStatus(item) ? (
                <div className={mutedTextClass}>Persisted: {item.persistedStatus}</div>
              ) : null}
              <div className={mutedTextClass}>
                {item.staleWarning ? `Persisted status is stale` : `Exact enough for list`}
              </div>
              <div className={mutedTextClass}>Due: {formatDate(item.dueDate)}</div>
            </MobileQueueSection>
            <MobileQueueSection title="Participants" compact>
              <PaymentParticipants item={item} returnTo={returnTo} />
            </MobileQueueSection>
            <MobileQueueSection title="Freshness" compact>
              <div className={mutedTextClass}>Attachments: {item.attachmentsCount}</div>
              <div className={mutedTextClass}>Updated: {formatDate(item.updatedAt)}</div>
            </MobileQueueSection>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function PaymentsTabletRows({ items, returnTo }: { items: PaymentItem[]; returnTo: string }) {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className={emptyPanelClass}>No payment requests found for the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
      <div className="condensedList">
        {items.map((item) => (
          <TabletRow
            key={item.id}
            eyebrow="Payment request"
            primary={
              <>
                <Link href={withReturnTo(`/payments/${item.id}`, returnTo)}>
                  <strong>{renderConsumerLabel(item.payer)}</strong>
                </Link>
                <div className={mutedTextClass}>Requester: {renderConsumerLabel(item.requester)}</div>
                <div className={subtleTextClass}>{item.id}</div>
              </>
            }
            badges={
              <>
                <StatusPill status={item.effectiveStatus} />
                <TinyPill tone="cyan">
                  {item.amount} {item.currencyCode}
                </TinyPill>
                {item.paymentRail ? <TinyPill>{item.paymentRail}</TinyPill> : null}
              </>
            }
            cells={[
              <PaymentParticipantsSummary item={item} key="participants" returnTo={returnTo} />,
              <div key="status">
                {shouldShowPersistedStatus(item) ? (
                  <div className={mutedTextClass}>Persisted: {item.persistedStatus}</div>
                ) : null}
                {item.staleWarning ? <div className={mutedTextClass}>Persisted status is stale</div> : null}
              </div>,
              <div key="amount">
                <div className={mutedTextClass}>Due: {formatDate(item.dueDate)}</div>
                <div className={mutedTextClass}>Rail: {item.paymentRail ?? `No rail`}</div>
              </div>,
              <div key="timing-assigned">
                <div className={mutedTextClass}>Updated: {formatDate(item.updatedAt)}</div>
                {item.assignedTo ? (
                  <div className={mutedTextClass}>
                    Assigned: <PaymentAssignedTo item={item} />
                  </div>
                ) : null}
                {item.attachmentsCount > 0 ? (
                  <div className={mutedTextClass}>Attachments: {item.attachmentsCount}</div>
                ) : null}
              </div>,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function PaymentsDesktopTable({ items, returnTo }: { items: PaymentItem[]; returnTo: string }) {
  return (
    <div className="readSurface hidden xl:block" data-view="desktop">
      <DenseTable
        headers={[`Request`, `Participants`, `Status / follow-up`, `Amount / timing`]}
        emptyMessage="No payment requests found for the current filters."
      >
        {items.length === 0
          ? null
          : items.map((item) => (
              <tr key={item.id}>
                <td>
                  <div className={subtleTextClass}>Payment request</div>
                  <div className="mb-1 text-sm text-white/90">Payer: {renderConsumerLabel(item.payer)}</div>
                  <div className={mutedTextClass}>Requester: {renderConsumerLabel(item.requester)}</div>
                  <Link href={withReturnTo(`/payments/${item.id}`, returnTo)} className="block">
                    <strong className="block text-white">{item.id}</strong>
                  </Link>
                  <div className={mutedTextClass}>{item.paymentRail ?? `No rail`}</div>
                  {item.attachmentsCount > 0 ? (
                    <div className={subtleTextClass}>Attachments: {item.attachmentsCount}</div>
                  ) : null}
                </td>
                <td>
                  <PaymentParticipantsSummary item={item} returnTo={returnTo} />
                </td>
                <td>
                  <div>
                    <StatusPill status={item.effectiveStatus} />
                  </div>
                  {shouldShowPersistedStatus(item) ? (
                    <div className={mutedTextClass}>Persisted: {item.persistedStatus}</div>
                  ) : null}
                  {item.assignedTo ? (
                    <div className={mutedTextClass}>
                      Assigned: <PaymentAssignedTo item={item} />
                    </div>
                  ) : null}
                  {shouldShowFreshnessLabel(item) ? (
                    <div className={mutedTextClass}>
                      {item.staleWarning ? `Persisted status is stale` : `Freshness: ${item.dataFreshnessClass}`}
                    </div>
                  ) : null}
                </td>
                <td>
                  <div className="font-semibold text-white/92">
                    {item.amount} {item.currencyCode}
                  </div>
                  <div className={mutedTextClass}>Due: {formatDate(item.dueDate)}</div>
                  <div className={mutedTextClass}>Updated: {formatDate(item.updatedAt)}</div>
                  {!item.assignedTo ? <div className={subtleTextClass}>Unassigned</div> : null}
                  {!shouldShowFreshnessLabel(item) ? (
                    <div className={subtleTextClass}>Freshness: {item.dataFreshnessClass}</div>
                  ) : null}
                </td>
              </tr>
            ))}
      </DenseTable>
    </div>
  );
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    quickstart?: string;
    cursor?: string;
    q?: string;
    status?: string;
    paymentRail?: string;
    currencyCode?: string;
    amountMin?: string;
    amountMax?: string;
    dueDateFrom?: string;
    dueDateTo?: string;
    createdFrom?: string;
    createdTo?: string;
    overdue?: string;
  }>;
}) {
  const params = await searchParams;
  const requestedQuickstartId = parseQuickstartId(params?.quickstart);
  const resolvedQuickstart = requestedQuickstartId ? await getQuickstart(requestedQuickstartId) : null;
  const appliedQuickstart = resolvedQuickstart?.targetPath === `/payments` ? resolvedQuickstart : null;
  const q = params?.q?.trim() ?? ``;
  const status = params?.status?.trim() || appliedQuickstart?.filters.status || ``;
  const paymentRail = params?.paymentRail?.trim() || appliedQuickstart?.filters.paymentRail || ``;
  const currencyCode = params?.currencyCode?.trim() || appliedQuickstart?.filters.currencyCode || ``;
  const amountMin = params?.amountMin?.trim() ?? ``;
  const amountMax = params?.amountMax?.trim() ?? ``;
  const dueDateFrom = params?.dueDateFrom?.trim() ?? ``;
  const dueDateTo = params?.dueDateTo?.trim() ?? ``;
  const createdFrom = params?.createdFrom?.trim() ?? ``;
  const createdTo = params?.createdTo?.trim() ?? ``;
  const overdue =
    params?.overdue === `true` || (params?.overdue == null && appliedQuickstart?.filters.overdue === true);
  const cursor = params?.cursor?.trim() ?? ``;
  const data = await getPayments({
    cursor: cursor || undefined,
    q,
    status,
    paymentRail,
    currencyCode,
    amountMin: amountMin ? Number(amountMin) : undefined,
    amountMax: amountMax ? Number(amountMax) : undefined,
    dueDateFrom: dueDateFrom || undefined,
    dueDateTo: dueDateTo || undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    overdue,
  });

  function nextHref(nextCursor: string) {
    const query = new URLSearchParams();
    if (requestedQuickstartId) query.set(`quickstart`, requestedQuickstartId);
    if (q) query.set(`q`, q);
    if (status) query.set(`status`, status);
    if (paymentRail) query.set(`paymentRail`, paymentRail);
    if (currencyCode) query.set(`currencyCode`, currencyCode);
    if (amountMin) query.set(`amountMin`, amountMin);
    if (amountMax) query.set(`amountMax`, amountMax);
    if (dueDateFrom) query.set(`dueDateFrom`, dueDateFrom);
    if (dueDateTo) query.set(`dueDateTo`, dueDateTo);
    if (createdFrom) query.set(`createdFrom`, createdFrom);
    if (createdTo) query.set(`createdTo`, createdTo);
    if (overdue) query.set(`overdue`, `true`);
    query.set(`cursor`, nextCursor);
    return `/payments?${query.toString()}`;
  }

  const items = data?.items ?? [];
  const activeFilterCount = [
    q,
    status,
    paymentRail,
    currencyCode,
    amountMin,
    amountMax,
    dueDateFrom,
    dueDateTo,
    createdFrom,
    createdTo,
    overdue ? `overdue` : ``,
  ].filter(Boolean).length;
  const currentQueueHref = buildPathWithSearch(`/payments`, {
    quickstart: requestedQuickstartId,
    q,
    status,
    paymentRail,
    currencyCode,
    amountMin,
    amountMax,
    dueDateFrom,
    dueDateTo,
    createdFrom,
    createdTo,
    overdue: overdue ? `true` : undefined,
    cursor,
  });

  return (
    <WorkspaceLayout workspace="payments">
      <>
        <Panel
          title="Payments"
          description="Payment request triage with direct escalation into operations buckets and case drilldowns."
          actions={
            <div className={buttonRowClass}>
              <TinyPill tone="cyan">{items.length} visible</TinyPill>
              <TinyPill>{activeFilterCount > 0 ? `${activeFilterCount} filters active` : `All timing states`}</TinyPill>
              <ActionGhost href="/payments/operations">Open operations queue</ActionGhost>
            </div>
          }
          surface="primary"
        >
          <p className={mutedTextClass}>
            Current queue posture: {items.length} visible cases
            {overdue ? ` · overdue slice active` : ``}
            {status ? ` · status ${status}` : ``}
            {paymentRail ? ` · rail ${paymentRail}` : ``}
          </p>
        </Panel>

        {appliedQuickstart ? (
          <Panel
            title={appliedQuickstart.label}
            description={appliedQuickstart.description}
            actions={<ActionGhost href="/payments">Remove quickstart</ActionGhost>}
            surface="support"
          />
        ) : params?.quickstart ? (
          <Panel surface="meta">
            <p className={mutedTextClass}>The requested quickstart could not be resolved for the payments queue.</p>
          </Panel>
        ) : null}

        <ResponsiveFilterPanel
          className="order-3 xl:order-2"
          title="Queue filters"
          description="Narrow the operational slice without leaving the queue."
          summaryLabel="Filters"
          summaryValue={`${activeFilterCount} active`}
          activeCount={activeFilterCount}
        >
          <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" method="get">
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Search</span>
              <input
                className={textInputClass}
                name="q"
                defaultValue={q}
                placeholder="Search by id, email or description"
              />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Effective status</span>
              <input className={textInputClass} name="status" defaultValue={status} placeholder="status" />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Payment rail</span>
              <input className={textInputClass} name="paymentRail" defaultValue={paymentRail} placeholder="rail" />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Currency</span>
              <input
                className={textInputClass}
                name="currencyCode"
                defaultValue={currencyCode}
                placeholder="currency"
              />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Minimum amount</span>
              <input
                className={textInputClass}
                name="amountMin"
                defaultValue={amountMin}
                placeholder="min amount"
                inputMode="decimal"
              />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Maximum amount</span>
              <input
                className={textInputClass}
                name="amountMax"
                defaultValue={amountMax}
                placeholder="max amount"
                inputMode="decimal"
              />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Due date from</span>
              <input className={textInputClass} name="dueDateFrom" type="date" defaultValue={dueDateFrom} />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Due date to</span>
              <input className={textInputClass} name="dueDateTo" type="date" defaultValue={dueDateTo} />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Created from</span>
              <input className={textInputClass} name="createdFrom" type="date" defaultValue={createdFrom} />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Created to</span>
              <input className={textInputClass} name="createdTo" type="date" defaultValue={createdTo} />
            </label>
            <div className="flex flex-col justify-end gap-3 xl:col-span-2">
              <label className={checkboxFieldClass}>
                <input
                  className={checkboxInputClass}
                  name="overdue"
                  type="checkbox"
                  value="true"
                  defaultChecked={overdue}
                />
                <span>Overdue only</span>
              </label>
              <div className={buttonRowClass}>
                <ActionGhost type="submit">Apply</ActionGhost>
                <ActionGhost href="/payments">Reset</ActionGhost>
              </div>
            </div>
          </form>
        </ResponsiveFilterPanel>

        <Panel
          className="order-2 xl:order-3"
          title="Payment request queue"
          description={`${items.length} rows in this window · cursor ${cursor ? `active` : `start`} · ${q ? `search active` : `queue window`}`}
          actions={
            <div className={buttonRowClass}>
              {status ? <TinyPill>{status}</TinyPill> : null}
              {overdue ? <TinyPill>Overdue slice</TinyPill> : null}
              {data?.pageInfo.nextCursor ? (
                <ActionGhost href={nextHref(data.pageInfo.nextCursor)}>Next</ActionGhost>
              ) : null}
            </div>
          }
          surface="support"
        >
          <PaymentsMobileCards items={items} returnTo={currentQueueHref} />
          <PaymentsTabletRows items={items} returnTo={currentQueueHref} />
          <PaymentsDesktopTable items={items} returnTo={currentQueueHref} />
        </Panel>
      </>
    </WorkspaceLayout>
  );
}
