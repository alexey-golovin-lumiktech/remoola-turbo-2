import { ActionGhost } from '../../../../components/action-ghost';
import { Panel } from '../../../../components/panel';
import { fieldClass, fieldLabelClass, textInputClass } from '../../../../components/ui-classes';
import { type LedgerView } from '../page.params';

export function LedgerFilters({
  view,
  q,
  type,
  status,
  currencyCode,
  amountSign,
  paymentRequestId,
  consumerId,
  dateFrom,
  dateTo,
}: {
  view: LedgerView;
  q: string | undefined;
  type: string | undefined;
  status: string | undefined;
  currencyCode: string | undefined;
  amountSign: string | undefined;
  paymentRequestId: string | undefined;
  consumerId: string | undefined;
  dateFrom: string | undefined;
  dateTo: string | undefined;
}) {
  return (
    <Panel
      title="Queue filters"
      description="Use the exact identifiers and status slices needed for ledger or dispute investigation."
    >
      <form className="grid gap-3 md:grid-cols-2 xl:grid-cols-4" method="get">
        {view === `disputes` ? <input type="hidden" name="view" value="disputes" /> : null}
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Search</span>
          <input
            className={textInputClass}
            name="q"
            defaultValue={q}
            placeholder="Search by ids, Stripe ids or idempotency key"
          />
        </label>
        {view === `entries` ? (
          <label className={fieldClass}>
            <span className={fieldLabelClass}>Entry type</span>
            <input className={textInputClass} name="type" defaultValue={type} placeholder="type" />
          </label>
        ) : null}
        {view === `entries` ? (
          <label className={fieldClass}>
            <span className={fieldLabelClass}>Effective status</span>
            <input className={textInputClass} name="status" defaultValue={status} placeholder="effective status" />
          </label>
        ) : null}
        {view === `entries` ? (
          <label className={fieldClass}>
            <span className={fieldLabelClass}>Currency</span>
            <input className={textInputClass} name="currencyCode" defaultValue={currencyCode} placeholder="currency" />
          </label>
        ) : null}
        {view === `entries` ? (
          <label className={fieldClass}>
            <span className={fieldLabelClass}>Amount sign</span>
            <input className={textInputClass} name="amountSign" defaultValue={amountSign} placeholder="amount sign" />
          </label>
        ) : null}
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Payment request</span>
          <input
            className={textInputClass}
            name="paymentRequestId"
            defaultValue={paymentRequestId}
            placeholder="payment request id"
          />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Consumer</span>
          <input className={textInputClass} name="consumerId" defaultValue={consumerId} placeholder="consumer id" />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Date from</span>
          <input className={textInputClass} name="dateFrom" type="date" defaultValue={dateFrom} />
        </label>
        <label className={fieldClass}>
          <span className={fieldLabelClass}>Date to</span>
          <input className={textInputClass} name="dateTo" type="date" defaultValue={dateTo} />
        </label>
        <div className="flex items-end gap-2 xl:col-span-2">
          <ActionGhost type="submit">Apply</ActionGhost>
          <ActionGhost href={view === `disputes` ? `/ledger?view=disputes` : `/ledger`}>Reset</ActionGhost>
        </div>
      </form>
    </Panel>
  );
}
