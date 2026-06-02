import { ActionGhost } from '../../../../../components/action-ghost';
import { Panel } from '../../../../../components/panel';
import { type LedgerEntryCasePageData } from '../page.loader';

export function LedgerEntryHeaderPanel({
  ledgerCase,
  backToQueueHref,
}: {
  ledgerCase: LedgerEntryCasePageData[`ledgerCase`];
  backToQueueHref: string;
}) {
  return (
    <Panel
      eyebrow="Ledger investigation"
      title="Ledger Entry"
      description={ledgerCase.id}
      actions={
        <div className="flex flex-wrap gap-2">
          <ActionGhost href={backToQueueHref}>Back to queue</ActionGhost>
          <ActionGhost href={`/consumers/${ledgerCase.consumer.id}`}>Consumer case</ActionGhost>
          {ledgerCase.paymentRequest ? (
            <ActionGhost href={`/payments/${ledgerCase.paymentRequest.id}`}>Payment request</ActionGhost>
          ) : null}
          {ledgerCase.paymentRequest ? (
            <ActionGhost href={`/audit/admin-actions?resourceId=${ledgerCase.paymentRequest.id}`}>
              Related admin actions
            </ActionGhost>
          ) : null}
        </div>
      }
      surface="primary"
    >
      <div className="pillRow">
        <span className="pill">{ledgerCase.core.type}</span>
        <span className="pill">{ledgerCase.core.effectiveStatus}</span>
        <span className="pill">{ledgerCase.core.currencyCode}</span>
      </div>
    </Panel>
  );
}
