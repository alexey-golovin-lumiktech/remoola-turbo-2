import Link from 'next/link';

import { getPaymentMethods } from '../../../lib/admin-api.server';

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
    <>
      <section className="panel pageHeader">
        <div>
          <h1>Payment Methods</h1>
          <p className="muted">
            Investigation-first list surface for payment methods: consumer linkage, default state, fingerprint context
            and soft-delete continuity. Write controls stay on the detail page only.
          </p>
        </div>
        <form method="get" className="actionsRow">
          <input name="consumerId" defaultValue={consumerId} placeholder="Consumer id" />
          <select name="type" defaultValue={type}>
            <option value="">All method types</option>
            <option value="CREDIT_CARD">CREDIT_CARD</option>
            <option value="BANK_ACCOUNT">BANK_ACCOUNT</option>
          </select>
          <select name="defaultSelected" defaultValue={defaultSelected}>
            <option value="">All default states</option>
            <option value="true">Default only</option>
            <option value="false">Non-default only</option>
          </select>
          <input name="fingerprint" defaultValue={fingerprint} placeholder="Exact fingerprint" />
          <label className="muted">
            <input name="includeDeleted" type="checkbox" value="true" defaultChecked={includeDeleted} /> Include deleted
          </label>
          <button className="secondaryButton" type="submit">
            Apply
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="pageHeader">
          <div>
            <h2>Read-only queue</h2>
            <p className="muted">
              {data?.total ?? 0} results · page {data?.page ?? 1} / {totalPages}
            </p>
          </div>
          <div className="actionsRow">
            <Link className="secondaryButton" href="/payment-methods">
              Clear filters
            </Link>
            <Link
              className="secondaryButton"
              aria-disabled={page <= 1}
              href={page > 1 ? pageHref(page - 1) : pageHref(1)}
            >
              Previous
            </Link>
            <Link
              className="secondaryButton"
              aria-disabled={page >= totalPages}
              href={page < totalPages ? pageHref(page + 1) : pageHref(totalPages)}
            >
              Next
            </Link>
          </div>
        </div>

        <div className="tableWrap">
          <table>
            <thead>
              <tr>
                <th>Method</th>
                <th>Consumer</th>
                <th>Default</th>
                <th>Fingerprint</th>
                <th>Status</th>
                <th>Updated</th>
              </tr>
            </thead>
            <tbody>
              {(data?.items ?? []).map((item) => (
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
                    <div>{item.deletedAt ? `Soft-deleted` : item.status === `DISABLED` ? `Disabled` : `Active`}</div>
                    {item.disabledAt ? <div className="muted">Disabled: {formatDate(item.disabledAt)}</div> : null}
                    <div className="muted">Created: {formatDate(item.createdAt)}</div>
                  </td>
                  <td>{formatDate(item.updatedAt)}</td>
                </tr>
              ))}
              {(data?.items ?? []).length === 0 ? (
                <tr>
                  <td colSpan={6}>No payment methods found for the current filters.</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
