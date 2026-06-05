import { Panel } from '../../../../../components/panel';
import { mutedTextClass } from '../../../../../components/ui-classes';
import { formatDateTime } from '../../../../../lib/admin-format';
import { type PayoutCasePageData } from '../page.loader';

function renderDestinationLabel(paymentMethod: {
  type: string;
  brand: string | null;
  last4: string | null;
  bankLast4: string | null;
}) {
  const suffix = paymentMethod.last4 ?? paymentMethod.bankLast4 ?? `----`;
  return paymentMethod.brand ? `${paymentMethod.brand} •••• ${suffix}` : `${paymentMethod.type} •••• ${suffix}`;
}

export function PayoutSummarySection({ payoutCase }: { payoutCase: PayoutCasePageData[`payoutCase`] }) {
  const highValueThresholdLabel = payoutCase.highValue.thresholdAmount
    ? `${payoutCase.highValue.thresholdCurrency} >= ${payoutCase.highValue.thresholdAmount}`
    : `not configured`;
  return (
    <section className="statsGrid">
      <Panel>
        <h3>Payout status</h3>
        <p className={mutedTextClass}>
          Amount: {payoutCase.core.amount} {payoutCase.core.currencyCode}
        </p>
        <p className={mutedTextClass}>Persisted: {payoutCase.core.persistedStatus}</p>
        <p className={mutedTextClass}>Effective: {payoutCase.core.effectiveStatus}</p>
        <p className={mutedTextClass}>
          Current payout status follows the latest ledger outcome, not a separate payout table.
        </p>
      </Panel>
      <Panel>
        <h3>Destination</h3>
        {payoutCase.destinationPaymentMethodSummary ? (
          <>
            <p className={mutedTextClass}>{renderDestinationLabel(payoutCase.destinationPaymentMethodSummary)}</p>
            <p className={mutedTextClass}>Linkage: {payoutCase.destinationLinkageSource}</p>
            <p className={mutedTextClass}>
              Deleted: {formatDateTime(payoutCase.destinationPaymentMethodSummary.deletedAt)}
            </p>
          </>
        ) : (
          <>
            <p className={mutedTextClass}>Destination method unavailable.</p>
            <p className={mutedTextClass}>No payout destination link could be confirmed for this case.</p>
          </>
        )}
      </Panel>
      <Panel>
        <h3>Threshold details</h3>
        <p className={mutedTextClass}>Threshold: {payoutCase.stuckPolicy.thresholdHours}h</p>
        <p className={mutedTextClass}>Breach condition: {payoutCase.stuckPolicy.breachCondition}</p>
        <p className={mutedTextClass}>Expected follow-up: {payoutCase.stuckPolicy.expectedOperatorReaction}</p>
      </Panel>
      <Panel>
        <h3>High-value policy</h3>
        <p className={mutedTextClass}>Eligibility: {payoutCase.highValue.eligibility}</p>
        <p className={mutedTextClass}>Threshold rule: {highValueThresholdLabel}</p>
        <p className={mutedTextClass}>{payoutCase.highValuePolicy.wording}</p>
      </Panel>
    </section>
  );
}
