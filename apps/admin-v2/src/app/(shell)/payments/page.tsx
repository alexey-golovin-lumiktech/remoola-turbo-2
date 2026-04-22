import Link from 'next/link';

import { StatusPill } from '../../../components/status-pill';
import { getPayments, type PaymentsListResponse } from '../../../lib/admin-api.server';

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
      <div className="readSurface" data-view="mobile">
        <div className="panel muted">No payment requests found for the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface" data-view="mobile">
      <div className="queueCards">
        {items.map((item) => (
          <article className="queueCard" key={item.id}>
            <div className="pageHeader">
              <div>
                <Link href={`/payments/${item.id}`}>
                  <strong>{item.id}</strong>
                </Link>
                <div className="muted">{item.paymentRail ?? `No rail`}</div>
              </div>
              <div className="muted">
                {item.amount} {item.currencyCode}
              </div>
            </div>
            <div className="queueCardBody">
              <PaymentParticipants item={item} />
              <PaymentStatus item={item} />
              <div className="muted">Attachments: {item.attachmentsCount}</div>
              <div className="muted">Due: {formatDate(item.dueDate)}</div>
              <div className="muted">Updated: {formatDate(item.updatedAt)}</div>
              <div className="muted">
                Assigned to: <PaymentAssignedTo item={item} />
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PaymentsTabletRows({ items }: { items: PaymentItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface" data-view="tablet">
        <div className="panel muted">No payment requests found for the current filters.</div>
      </div>
    );
  }

  return (
    <div className="readSurface" data-view="tablet">
      <div className="condensedList">
        {items.map((item) => (
          <article className="condensedRow" key={item.id}>
            <div className="condensedRowPrimary">
              <Link href={`/payments/${item.id}`}>
                <strong>{item.id}</strong>
              </Link>
              <div className="muted">{item.paymentRail ?? `No rail`}</div>
            </div>
            <div className="condensedRowMeta">
              <PaymentParticipants item={item} />
            </div>
            <div className="condensedRowMeta">
              <PaymentStatus item={item} />
            </div>
            <div className="condensedRowMeta">
              <div>
                {item.amount} {item.currencyCode}
              </div>
              <div className="muted">Attachments: {item.attachmentsCount}</div>
            </div>
            <div className="condensedRowMeta">
              <div className="muted">Due: {formatDate(item.dueDate)}</div>
              <div className="muted">Updated: {formatDate(item.updatedAt)}</div>
            </div>
            <div className="condensedRowMeta">
              <PaymentAssignedTo item={item} />
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function PaymentsDesktopTable({ items }: { items: PaymentItem[] }) {
  return (
    <div className="readSurface" data-view="desktop">
      <div className="tableWrap">
        <table className="tableDense">
          <thead>
            <tr>
              <th>Payment request</th>
              <th>Participants</th>
              <th>Status</th>
              <th>Assigned to</th>
              <th>Amount</th>
              <th>Freshness</th>
              <th>Due / Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
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
            {items.length === 0 ? (
              <tr>
                <td colSpan={7}>No payment requests found for the current filters.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<{
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
  const q = params?.q?.trim() ?? ``;
  const status = params?.status?.trim() ?? ``;
  const paymentRail = params?.paymentRail?.trim() ?? ``;
  const currencyCode = params?.currencyCode?.trim() ?? ``;
  const amountMin = params?.amountMin?.trim() ?? ``;
  const amountMax = params?.amountMax?.trim() ?? ``;
  const dueDateFrom = params?.dueDateFrom?.trim() ?? ``;
  const dueDateTo = params?.dueDateTo?.trim() ?? ``;
  const createdFrom = params?.createdFrom?.trim() ?? ``;
  const createdTo = params?.createdTo?.trim() ?? ``;
  const overdue = params?.overdue === `true`;
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
  );
}
