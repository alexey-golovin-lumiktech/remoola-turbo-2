import { PasswordConfirmationField } from '../../../../../../components/admin-form-fields/password-confirmation-field';
import {
  resumeExchangeRuleAction,
  runExchangeRuleNowAction,
  pauseExchangeRuleAction,
} from '../../../../../../lib/admin-mutations/exchange.server';
import { type ExchangeRuleCasePageData } from '../page.loader';

export function ExchangeRuleActionsSection({
  rule,
  canManage,
}: {
  rule: ExchangeRuleCasePageData[`rule`];
  canManage: boolean;
}) {
  if (!canManage) {
    return null;
  }

  return (
    <article className="panel">
      <h2>Allowed actions</h2>
      <div className="formStack">
        {rule.actionControls.canPause ? (
          <form action={pauseExchangeRuleAction.bind(null, rule.id)} className="formStack">
            <input type="hidden" name="version" value={String(rule.version)} />
            <input type="hidden" name="consumerId" value={rule.consumer.id} />
            <button className="secondaryButton" type="submit">
              Pause rule
            </button>
          </form>
        ) : null}
        {rule.actionControls.canResume ? (
          <form action={resumeExchangeRuleAction.bind(null, rule.id)} className="formStack">
            <input type="hidden" name="version" value={String(rule.version)} />
            <input type="hidden" name="consumerId" value={rule.consumer.id} />
            <button className="secondaryButton" type="submit">
              Resume rule
            </button>
          </form>
        ) : null}
        {rule.actionControls.canRunNow ? (
          <form action={runExchangeRuleNowAction.bind(null, rule.id)} className="formStack">
            <input type="hidden" name="version" value={String(rule.version)} />
            <input type="hidden" name="consumerId" value={rule.consumer.id} />
            <p className="muted">
              Manual run is protected by a strong idempotency key, strict version checks and single active execution
              lock.
            </p>
            <PasswordConfirmationField />
            <button className="secondaryButton" type="submit">
              Run now
            </button>
          </form>
        ) : null}
      </div>
    </article>
  );
}
