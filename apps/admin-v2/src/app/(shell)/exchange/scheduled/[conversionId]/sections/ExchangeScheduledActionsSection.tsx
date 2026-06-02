import { fieldClass, fieldLabelClass, textInputClass } from '../../../../../../components/ui-classes';
import {
  forceExecuteScheduledExchangeAction,
  cancelScheduledExchangeAction,
} from '../../../../../../lib/admin-mutations/exchange.server';
import { type ExchangeScheduledCasePageData } from '../page.loader';

export function ExchangeScheduledActionsSection({
  conversion,
  canManage,
}: {
  conversion: ExchangeScheduledCasePageData[`conversion`];
  canManage: boolean;
}) {
  if (!canManage) {
    return null;
  }

  return (
    <article className="panel">
      <h2>Allowed actions</h2>
      <div className="formStack">
        {conversion.actionControls.canForceExecute ? (
          <form action={forceExecuteScheduledExchangeAction.bind(null, conversion.id)} className="formStack">
            <input type="hidden" name="version" value={String(conversion.version)} />
            <input type="hidden" name="consumerId" value={conversion.consumer.id} />
            <input type="hidden" name="confirmed" value="false" />
            <p className="muted">
              Force execute is confirmation-gated and protected by a strong idempotency key plus a single active
              executor lock.
            </p>
            <p className="muted">
              Source amount: {conversion.core.amount} {conversion.core.sourceCurrency}
            </p>
            <label className="field">
              <span>Confirmation</span>
              <input type="checkbox" name="confirmed" value="true" required />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Current password</span>
              <input
                className={textInputClass}
                name="passwordConfirmation"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Confirm with your current password"
              />
            </label>
            <button className="secondaryButton" type="submit" name="confirmedSubmit" value="true">
              Force execute scheduled conversion
            </button>
          </form>
        ) : null}

        {conversion.actionControls.canCancel ? (
          <form action={cancelScheduledExchangeAction.bind(null, conversion.id)} className="formStack">
            <input type="hidden" name="version" value={String(conversion.version)} />
            <input type="hidden" name="consumerId" value={conversion.consumer.id} />
            <input type="hidden" name="confirmed" value="false" />
            <p className="muted">Cancellation is limited to pending conversions only.</p>
            <label className="field">
              <span>Confirmation</span>
              <input type="checkbox" name="confirmed" value="true" required />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Current password</span>
              <input
                className={textInputClass}
                name="passwordConfirmation"
                type="password"
                autoComplete="current-password"
                required
                placeholder="Confirm with your current password"
              />
            </label>
            <button className="secondaryButton" type="submit" name="confirmedSubmit" value="true">
              Cancel scheduled conversion
            </button>
          </form>
        ) : null}

        {!conversion.actionControls.canForceExecute && !conversion.actionControls.canCancel ? (
          <p className="muted">No exchange actions are currently available for this conversion.</p>
        ) : null}
      </div>
    </article>
  );
}
