import { ActionGhost } from '../../../../components/action-ghost';
import { ContextStat } from '../../../../components/context-stat';
import { type LedgerView } from '../page.params';

export function LedgerContextRail({
  view,
  entryCount,
  disputeCount,
  cursor,
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
  entryCount: number;
  disputeCount: number;
  cursor: string | undefined;
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
    <>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
        <ContextStat label="View" value={view === `disputes` ? `Disputes` : `Entries`} tone="cyan" />
        <ContextStat label="Visible rows" value={view === `disputes` ? disputeCount : entryCount} />
        <ContextStat label="Cursor" value={cursor ? `Active` : `Start`} />
        <ContextStat
          label="Active filters"
          value={
            [q, type, status, currencyCode, amountSign, paymentRequestId, consumerId, dateFrom, dateTo].filter(Boolean)
              .length
          }
          tone={
            [q, type, status, currencyCode, amountSign, paymentRequestId, consumerId, dateFrom, dateTo].filter(Boolean)
              .length > 0
              ? `amber`
              : `neutral`
          }
        />
      </div>
      <div className="contextRailSection">
        <h4>Queue shortcuts</h4>
        <div className="contextRailLinks">
          <ActionGhost href="/ledger/anomalies">Anomalies</ActionGhost>
          <ActionGhost href="/payments">Payments</ActionGhost>
          <ActionGhost href="/payouts">Payouts</ActionGhost>
        </div>
      </div>
    </>
  );
}
