import { Panel } from '../../../../../components/panel';
import { mutedTextClass, rawDataClass, stackClass } from '../../../../../components/ui-classes';
import { EMPTY_VALUE, formatDateTime } from '../../../../../lib/admin-format';
import { type PayoutCasePageData } from '../page.loader';

function renderMetadata(value: Record<string, unknown> | null | undefined) {
  if (!value || Object.keys(value).length === 0) {
    return <p className={mutedTextClass}>No metadata.</p>;
  }

  return <pre className={rawDataClass}>{JSON.stringify(value, null, 2)}</pre>;
}

export function PayoutCoreLinksSection({ payoutCase }: { payoutCase: PayoutCasePageData[`payoutCase`] }) {
  return (
    <section className="detailGrid">
      <Panel title="Core links">
        <div className={stackClass}>
          <p className={mutedTextClass}>Ledger id: {payoutCase.core.ledgerId}</p>
          <p className={mutedTextClass}>External reference: {payoutCase.core.externalReference ?? EMPTY_VALUE}</p>
          <p className={mutedTextClass}>Outcome age: {payoutCase.outcomeAgeHours.toFixed(1)}h</p>
          <p className={mutedTextClass}>Updated: {formatDateTime(payoutCase.core.updatedAt)}</p>
          <p className={mutedTextClass}>Version: {payoutCase.version}</p>
        </div>
        {payoutCase.paymentRequest ? (
          <div className={stackClass}>
            <p className={mutedTextClass}>Linked payment request: {payoutCase.paymentRequest.id}</p>
            <p className={mutedTextClass}>
              {payoutCase.paymentRequest.amount} {payoutCase.paymentRequest.currencyCode} ·{` `}
              {payoutCase.paymentRequest.status}
            </p>
          </div>
        ) : (
          <p className={mutedTextClass}>No payment request is linked to this payout.</p>
        )}
      </Panel>
      <Panel title="Metadata">{renderMetadata(payoutCase.metadata)}</Panel>
    </section>
  );
}
