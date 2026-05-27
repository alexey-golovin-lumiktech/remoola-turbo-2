import { adminV2PaymentsListQuerySchema } from '@remoola/api-types';

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
  PaymentsDesktopTable,
  PaymentsMobileCards,
  PaymentsTabletRows,
} from '../../../features/payments/payments-list-presenters';
import { getQuickstart } from '../../../lib/admin-api/overview.server';
import { getPayments } from '../../../lib/admin-api/payments.server';
import { buildPathWithSearch } from '../../../lib/navigation-context';
import {
  booleanSearchParam,
  dateSearchParam,
  finiteNumberSearchParam,
  type SearchParamValue,
  trimmedSearchParam,
} from '../../../lib/query-contract';
import { parseQuickstartId } from '../../../lib/quickstart-investigations';

export default async function PaymentsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, SearchParamValue>>;
}) {
  const params = await searchParams;
  const requestedQuickstartId = parseQuickstartId(trimmedSearchParam(params?.quickstart));
  const resolvedQuickstart = requestedQuickstartId ? await getQuickstart(requestedQuickstartId) : null;
  const appliedQuickstart = resolvedQuickstart?.targetPath === `/payments` ? resolvedQuickstart : null;
  const query = adminV2PaymentsListQuerySchema.parse({
    cursor: trimmedSearchParam(params?.cursor),
    q: trimmedSearchParam(params?.q),
    status: trimmedSearchParam(params?.status) || appliedQuickstart?.filters.status,
    paymentRail: trimmedSearchParam(params?.paymentRail) || appliedQuickstart?.filters.paymentRail,
    currencyCode: trimmedSearchParam(params?.currencyCode) || appliedQuickstart?.filters.currencyCode,
    amountMin: finiteNumberSearchParam(params?.amountMin),
    amountMax: finiteNumberSearchParam(params?.amountMax),
    dueDateFrom: dateSearchParam(params?.dueDateFrom),
    dueDateTo: dateSearchParam(params?.dueDateTo),
    createdFrom: dateSearchParam(params?.createdFrom),
    createdTo: dateSearchParam(params?.createdTo),
    overdue:
      booleanSearchParam(params?.overdue) ??
      (params?.overdue == null && appliedQuickstart?.filters.overdue === true ? true : undefined),
  });
  const q = query.q ?? ``;
  const status = query.status ?? ``;
  const paymentRail = query.paymentRail ?? ``;
  const currencyCode = query.currencyCode ?? ``;
  const amountMinValue = query.amountMin;
  const amountMaxValue = query.amountMax;
  const amountMin = amountMinValue === undefined ? `` : String(amountMinValue);
  const amountMax = amountMaxValue === undefined ? `` : String(amountMaxValue);
  const dueDateFrom = query.dueDateFrom ?? ``;
  const dueDateTo = query.dueDateTo ?? ``;
  const createdFrom = query.createdFrom ?? ``;
  const createdTo = query.createdTo ?? ``;
  const overdue = query.overdue === true;
  const cursor = query.cursor ?? ``;
  const data = await getPayments({
    cursor: cursor || undefined,
    q,
    status,
    paymentRail,
    currencyCode,
    amountMin: amountMinValue,
    amountMax: amountMaxValue,
    dueDateFrom: dueDateFrom || undefined,
    dueDateTo: dueDateTo || undefined,
    createdFrom: createdFrom || undefined,
    createdTo: createdTo || undefined,
    overdue: overdue ? true : undefined,
  });

  function nextHref(nextCursor: string) {
    return buildPathWithSearch(`/payments`, {
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
      cursor: nextCursor,
    });
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
    <WorkspaceLayout
      workspace="payments"
      context={
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
            <ContextStat label="Visible" value={items.length} tone="cyan" />
            <ContextStat
              label="Active filters"
              value={activeFilterCount}
              tone={activeFilterCount > 0 ? `amber` : `neutral`}
            />
            <ContextStat label="Window" value={cursor ? `Cursor` : `Start`} />
            <ContextStat label="Next page" value={data?.pageInfo.nextCursor ? `Available` : `End`} />
          </div>
          <div className="contextRailSection">
            <h4>Queue shortcuts</h4>
            <div className="contextRailLinks">
              <ActionGhost href="/payments/operations">Operations queue</ActionGhost>
              <ActionGhost href="/payouts">Payouts</ActionGhost>
              <ActionGhost href="/audit/admin-actions">Admin actions</ActionGhost>
            </div>
          </div>
        </>
      }
      contextTitle="Queue context"
      contextDescription="Volume, filter pressure, and nearby operational queues for the current payment slice."
    >
      <>
        <Panel
          eyebrow="Payment queue"
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
