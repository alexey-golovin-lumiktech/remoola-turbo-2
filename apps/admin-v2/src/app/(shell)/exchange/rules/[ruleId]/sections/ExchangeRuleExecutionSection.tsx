import { type ExchangeRuleCasePageData } from '../page.loader';

function renderLastExecution(value: Record<string, unknown> | null) {
  if (!value) {
    return <p className="muted">No persisted execution summary.</p>;
  }
  return <pre className="mono">{JSON.stringify(value, null, 2)}</pre>;
}

export function ExchangeRuleExecutionSection({ rule }: { rule: ExchangeRuleCasePageData[`rule`] }) {
  return (
    <article className="panel">
      <h2>Latest persisted execution</h2>
      {renderLastExecution(rule.lastExecution)}
    </article>
  );
}
