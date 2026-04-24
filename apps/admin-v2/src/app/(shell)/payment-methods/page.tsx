import Link from 'next/link';

import { ActionGhost } from '../../../components/action-ghost';
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
import { type PaymentMethodsListResponse, getPaymentMethods } from '../../../lib/admin-api.server';

type PaymentMethodItem = PaymentMethodsListResponse[`items`][number];

function formatDate(value: string | null | undefined): string {
  if (!value) return `-`;
  return new Date(value).toLocaleString();
}

function renderMethodLabel(item: {
  type: string;
  brand: string | null;
  last4: string | null;
  bankLast4: string | null;
}) {
  const suffix = item.last4 ?? item.bankLast4 ?? `----`;
  if (item.type === `CREDIT_CARD`) {
    return `${item.brand ?? `Card`} •••• ${suffix}`;
  }

  return `${item.type} •••• ${suffix}`;
}

function effectiveStatus(item: PaymentMethodItem): string {
  if (item.deletedAt) return `Soft-deleted`;
  if (item.status === `DISABLED`) return `Disabled`;
  return `Active`;
}

function PaymentMethodStatus({ item }: { item: PaymentMethodItem }) {
  return (
    <>
      <div>
        <StatusPill status={effectiveStatus(item)} />
      </div>
      {item.disabledAt ? <div className="muted">Disabled: {formatDate(item.disabledAt)}</div> : null}
      <div className="muted">Created: {formatDate(item.createdAt)}</div>
    </>
  );
}

function PaymentMethodsMobileCards({ items }: { items: PaymentMethodItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface md:hidden" data-view="mobile">
        <div className="panel muted">No payment methods found for the current filters.</div>
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
            href={`/payment-methods/${item.id}`}
            title={renderMethodLabel(item)}
            subtitle={
              <>
                {item.type} · <span className="mono">{item.id}</span>
              </>
            }
          >
            <div>
              Consumer:{` `}
              <Link href={`/consumers/${item.consumer.id}`}>{item.consumer.email ?? item.consumer.id}</Link>
            </div>
            <div className="muted">Default: {item.defaultSelected ? `Yes` : `No`}</div>
            <div className="muted mono">Fingerprint: {item.stripeFingerprint ?? `-`}</div>
            <PaymentMethodStatus item={item} />
            <div className="muted">Updated: {formatDate(item.updatedAt)}</div>
          </MobileQueueCard>
        ))}
      </div>
    </div>
  );
}

function PaymentMethodsTabletRows({ items }: { items: PaymentMethodItem[] }) {
  if (items.length === 0) {
    return (
      <div className="readSurface hidden md:block xl:hidden" data-view="tablet">
        <div className="panel muted">No payment methods found for the current filters.</div>
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
                <Link href={`/payment-methods/${item.id}`}>
                  <strong>{renderMethodLabel(item)}</strong>
                </Link>
                <div className="muted">{item.type}</div>
                <div className="muted mono">{item.id}</div>
              </>
            }
            cells={[
              <div key="consumer">
                <Link href={`/consumers/${item.consumer.id}`}>{item.consumer.email ?? item.consumer.id}</Link>
                <div className="muted mono">{item.consumer.id}</div>
              </div>,
              <div key="defaultFingerprint">
                <div>Default: {item.defaultSelected ? `Yes` : `No`}</div>
                <div className="muted mono">{item.stripeFingerprint ?? `-`}</div>
              </div>,
              <PaymentMethodStatus item={item} key="status" />,
              <div className="muted" key="updated">
                Updated: {formatDate(item.updatedAt)}
              </div>,
            ]}
          />
        ))}
      </div>
    </div>
  );
}

function PaymentMethodsDesktopTable({ items }: { items: PaymentMethodItem[] }) {
  return (
    <div className="readSurface hidden xl:block" data-view="desktop">
      <DenseTable
        headers={[`Method`, `Consumer`, `Default`, `Fingerprint`, `Status`, `Updated`]}
        emptyMessage="No payment methods found for the current filters."
      >
        {items.length === 0
          ? null
          : items.map((item) => (
              <tr key={item.id}>
                <td>
                  <Link href={`/payment-methods/${item.id}`}>
                    <strong>{renderMethodLabel(item)}</strong>
                  </Link>
                  <div className="muted">{item.type}</div>
                  <div className="muted mono">{item.id}</div>
                </td>
                <td>
                  <Link href={`/consumers/${item.consumer.id}`}>{item.consumer.email ?? item.consumer.id}</Link>
                  <div className="muted mono">{item.consumer.id}</div>
                </td>
                <td>{item.defaultSelected ? `Yes` : `No`}</td>
                <td>
                  <div className="mono">{item.stripeFingerprint ?? `-`}</div>
                </td>
                <td>
                  <PaymentMethodStatus item={item} />
                </td>
                <td>{formatDate(item.updatedAt)}</td>
              </tr>
            ))}
      </DenseTable>
    </div>
  );
}

export default async function PaymentMethodsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    page?: string;
    consumerId?: string;
    type?: string;
    defaultSelected?: string;
    fingerprint?: string;
    includeDeleted?: string;
  }>;
}) {
  const params = await searchParams;
  const page = params?.page ? Number(params.page) : 1;
  const consumerId = params?.consumerId?.trim() ?? ``;
  const type = params?.type?.trim() ?? ``;
  const defaultSelected = params?.defaultSelected?.trim() ?? ``;
  const fingerprint = params?.fingerprint?.trim() ?? ``;
  const includeDeleted = params?.includeDeleted === `true`;
  const data = await getPaymentMethods({
    page,
    consumerId,
    type,
    defaultSelected: defaultSelected === `` ? undefined : defaultSelected === `true`,
    fingerprint,
    includeDeleted,
  });
  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;

  function pageHref(nextPage: number) {
    const query = new URLSearchParams();
    if (consumerId) query.set(`consumerId`, consumerId);
    if (type) query.set(`type`, type);
    if (defaultSelected) query.set(`defaultSelected`, defaultSelected);
    if (fingerprint) query.set(`fingerprint`, fingerprint);
    if (includeDeleted) query.set(`includeDeleted`, `true`);
    query.set(`page`, String(nextPage));
    return `/payment-methods?${query.toString()}`;
  }

  return (
    <WorkspaceLayout workspace="payment-methods">
      <>
        <Panel
          title="Payment Methods"
          description="Investigation-first list surface for payment methods: consumer linkage, default state, fingerprint context and soft-delete continuity."
        >
          <p className="text-sm leading-6 text-white/60">
            Authorized write controls remain detail-scoped and are capability-gated.
          </p>
          <form method="get" className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Consumer id</span>
              <input className={textInputClass} name="consumerId" defaultValue={consumerId} placeholder="Consumer id" />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Method type</span>
              <select className={textInputClass} name="type" defaultValue={type}>
                <option value="">All method types</option>
                <option value="CREDIT_CARD">CREDIT_CARD</option>
                <option value="BANK_ACCOUNT">BANK_ACCOUNT</option>
              </select>
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Default state</span>
              <select className={textInputClass} name="defaultSelected" defaultValue={defaultSelected}>
                <option value="">All default states</option>
                <option value="true">Default only</option>
                <option value="false">Non-default only</option>
              </select>
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Fingerprint</span>
              <input
                className={textInputClass}
                name="fingerprint"
                defaultValue={fingerprint}
                placeholder="Exact fingerprint"
              />
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
                <ActionGhost href="/payment-methods">Reset</ActionGhost>
              </div>
            </div>
          </form>
        </Panel>

        <Panel
          title="Investigation queue"
          description={`${data?.total ?? 0} results · page ${data?.page ?? 1} / ${totalPages}`}
          actions={
            <div className={buttonRowClass}>
              <ActionGhost href="/payment-methods">Clear filters</ActionGhost>
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
          <PaymentMethodsMobileCards items={data?.items ?? []} />
          <PaymentMethodsTabletRows items={data?.items ?? []} />
          <PaymentMethodsDesktopTable items={data?.items ?? []} />
        </Panel>
      </>
    </WorkspaceLayout>
  );
}
