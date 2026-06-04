import { formatDateTime, EMPTY_VALUE } from '../../../../../../lib/admin-format';
import { type ExchangeRateCasePageData } from '../page.loader';

export function ExchangeRateSummaryGrid({ rate }: { rate: ExchangeRateCasePageData[`rate`] }) {
  return (
    <section className="statsGrid">
      <article className="panel">
        <h3>Rate tuple</h3>
        <p className="muted">Rate: {rate.core.rate}</p>
        <p className="muted">Inverse: {rate.core.inverseRate ?? EMPTY_VALUE}</p>
        <p className="muted">Spread: {rate.core.spreadBps ?? EMPTY_VALUE} bps</p>
        <p className="muted">Confidence: {rate.core.confidence ?? EMPTY_VALUE}</p>
      </article>
      <article className="panel">
        <h3>Provider context</h3>
        <p className="muted">Provider: {rate.core.provider ?? EMPTY_VALUE}</p>
        <p className="muted">Provider rate id: {rate.core.providerRateId ?? EMPTY_VALUE}</p>
        <p className="muted">Fetched: {formatDateTime(rate.core.fetchedAt)}</p>
      </article>
      <article className="panel">
        <h3>Staleness</h3>
        <p className="muted">Reference: {formatDateTime(rate.stalenessIndicator.referenceAt)}</p>
        <p className="muted">Age: {rate.stalenessIndicator.ageMinutes} minutes</p>
        <p className="muted">Threshold: {rate.stalenessIndicator.thresholdMinutes} minutes</p>
      </article>
    </section>
  );
}
