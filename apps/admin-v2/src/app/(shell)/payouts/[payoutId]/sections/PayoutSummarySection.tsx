import { Panel } from '../../../../../components/panel';
import { mutedTextClass } from '../../../../../components/ui-classes';
import { formatDateTime } from '../../../../../lib/admin-format';
import { type PayoutCasePageData } from '../page.loader';

export function PayoutSummarySection({
  payoutCase,
  highValueThresholdLabel,
  destinationLabel,
}: {
  payoutCase: PayoutCasePageData[`payoutCase`];
  highValueThresholdLabel: string;
  destinationLabel: string | null;
}) {
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
            <p className={mutedTextClass}>{destinationLabel}</p>
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
