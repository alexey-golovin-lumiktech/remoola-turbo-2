import Link from 'next/link';

import { DenseTable } from '../../../components/dense-table';
import { MobileQueueCard } from '../../../components/mobile-queue-card';
import { StatusPill } from '../../../components/status-pill';
import { TabletRow } from '../../../components/tablet-row';
import { WorkspaceLayout } from '../../../components/workspace-layout';
import { getPayments, getQuickstart, type PaymentsListResponse } from '../../../lib/admin-api.server';
import { parseQuickstartId } from '../../../lib/quickstart-investigations';

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

type PaymentItem = PaymentsListResponse[`items`][number];

function renderConsumerLink(consumer: PaymentItem[`payer`] | PaymentItem[`requester`]) {
  if (consumer.id) {
    return <Link href={`/consumers/${consumer.id}`}>{consumer.email ?? consumer.id}</Link>;
  }

  return consumer.email ?? `-`;
}

function PaymentParticipants({ item }: { item: PaymentItem }) {
  return (
    <>
      <div>Payer: {renderConsumerLink(item.payer)}</div>
      <div>Requester: {renderConsumerLink(item.requester)}</div>
    </>
  );
}

function PaymentStatus({ item }: { item: PaymentItem }) {
  return (
    <>
      <div>
        <StatusPill status={item.effectiveStatus} />
      </div>
      <div className="muted">Persisted: {item.persistedStatus}</div>
      <div className="muted">{item.staleWarning ? `Persisted status is stale` : `Exact enough for list`}</div>
    </>
  );
}

function PaymentAssignedTo({ item }: { item: PaymentItem }) {
  if (!item.assignedTo) {
    return <span className="muted">—</span>;
  }

  return (
    <>
      <span>{item.assignedTo.name ?? item.assignedTo.email ?? item.assignedTo.id}</span>
      {item.assignedTo.email ? <span className="muted"> {item.assignedTo.email}</span> : null}
    </>
  );
}

function PaymentsMobileCards({ items }: { items: PaymentItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className="panel muted">No payment requests found for the current filters.</div>
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
            href={`/payments/${item.id}`}
            title={item.id}
            subtitle={item.paymentRail ?? `No rail`}
            trailing={
              <>
                {item.amount} {item.currencyCode}
              </>
            }
          >
            <PaymentParticipants item={item} />
            <PaymentStatus item={item} />
            <div className="muted">Attachments: {item.attachmentsCount}</div>
            <div className="muted">Due: {formatDate(item.dueDate)}</div>
            <div className="muted">Updated: {formatDate(item.updatedAt)}</div>
            <div className="muted">
              Assigned to: <PaymentAssignedTo item={item} />
            </div>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function PaymentsTabletRows({ items }: { items: PaymentItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className="panel muted">No payment requests found for the current filters.</div>
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
                <Link href={`/payments/${item.id}`}>
                  <strong>{item.id}</strong>
                </Link>
                <div className="muted">{item.paymentRail ?? `No rail`}</div>
              </>
            }
            cells={[
              <PaymentParticipants item={item} key="participants" />,
              <PaymentStatus item={item} key="status" />,
              <div key="amount">
                <div>
                  {item.amount} {item.currencyCode}
                </div>
                <div className="muted">Attachments: {item.attachmentsCount}</div>
              </div>,
              <div key="timing-assigned">
                <div className="muted">Due: {formatDate(item.dueDate)}</div>
                <div className="muted">Updated: {formatDate(item.updatedAt)}</div>
                <div className="muted">
                  Assigned: <PaymentAssignedTo item={item} />
                </div>
              </div>,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function PaymentsDesktopTable({ items }: { items: PaymentItem[] }) {
  return (
    <div className="readSurface hidden xl:block" data-view="desktop">
      <DenseTable
        headers={[`Payment request`, `Participants`, `Status`, `Assigned to`, `Amount`, `Freshness`, `Due / Updated`]}
        emptyMessage="No payment requests found for the current filters."
      >
        {items.length === 0
          ? null
          : items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link href={`/payments/${item.id}`}>
                    <strong>{item.id}</strong>
                  </Link>
                  <div className="muted">{item.paymentRail ?? `No rail`}</div>
                  <div className="muted">Attachments: {item.attachmentsCount}</div>
                </td>
                <td>
                  <PaymentParticipants item={item} />
                </td>
                <td>
                  <div>
                    <StatusPill status={item.effectiveStatus} />
                  </div>
                  <div className="muted">Persisted: {item.persistedStatus}</div>
                </td>
                <td>
                  <PaymentAssignedTo item={item} />
                </td>
                <td>
                  {item.amount} {item.currencyCode}
                </td>
                <td>
                  <div>{item.dataFreshnessClass}</div>
                  <div className="muted">
                    {item.staleWarning ? `Persisted status is stale` : `Exact enough for list`}
                  </div>
                </td>
                <td>
                  <div className="muted">Due: {formatDate(item.dueDate)}</div>
                  <div className="muted">Updated: {formatDate(item.updatedAt)}</div>
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

  return (
    <WorkspaceLayout workspace="payments">
      <>
        <section className="panel pageHeader">
          <div>
            <h1>Payments</h1>
            <p className="muted">MVP-1c read-only payment request investigation with finance-safe cross-links.</p>
          </div>
          <div className="actionsRow">
            <Link className="secondaryButton" href="/payments/operations">
              Open operations queue
            </Link>
            <form className="actionsRow" method="get">
              <input name="q" defaultValue={q} placeholder="Search by id, email or description" />
              <input name="status" defaultValue={status} placeholder="status" />
              <input name="paymentRail" defaultValue={paymentRail} placeholder="rail" />
              <input name="currencyCode" defaultValue={currencyCode} placeholder="currency" />
              <input name="amountMin" defaultValue={amountMin} placeholder="min amount" inputMode="decimal" />
              <input name="amountMax" defaultValue={amountMax} placeholder="max amount" inputMode="decimal" />
              <input name="dueDateFrom" type="date" defaultValue={dueDateFrom} aria-label="Due date from" />
              <input name="dueDateTo" type="date" defaultValue={dueDateTo} aria-label="Due date to" />
              <input name="createdFrom" type="date" defaultValue={createdFrom} aria-label="Created from" />
              <input name="createdTo" type="date" defaultValue={createdTo} aria-label="Created to" />
              <label className="muted">
                <input name="overdue" type="checkbox" value="true" defaultChecked={overdue} /> Overdue only
              </label>
              <button className="secondaryButton" type="submit">
                Apply
              </button>
              <Link className="secondaryButton" href="/payments">
                Reset
              </Link>
            </form>
          </div>
        </section>

        {appliedQuickstart ? (
          <section className="panel">
            <div className="pageHeader">
              <div>
                <h2>{appliedQuickstart.label}</h2>
                <p className="muted">{appliedQuickstart.description}</p>
              </div>
              <Link className="secondaryButton" href="/payments">
                Remove quickstart
              </Link>
            </div>
          </section>
        ) : params?.quickstart ? (
          <section className="panel">
            <p className="muted">The requested quickstart could not be resolved for the payments queue.</p>
          </section>
        ) : null}

        <section className="panel">
          <div className="pageHeader">
            <div>
              <h2>Payment request queue</h2>
              <p className="muted">
                {items.length} rows in this window · cursor {cursor ? `active` : `start`}
              </p>
            </div>
            {data?.pageInfo.nextCursor ? (
              <Link className="secondaryButton" href={nextHref(data.pageInfo.nextCursor)}>
                Next
              </Link>
            ) : null}
          </div>
          <PaymentsMobileCards items={items} />
          <PaymentsTabletRows items={items} />
          <PaymentsDesktopTable items={items} />
        </section>
      </>
    </WorkspaceLayout>
  );
}
