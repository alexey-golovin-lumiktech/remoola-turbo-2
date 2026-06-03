import { PasswordConfirmationField } from '../../../../../../components/admin-form-fields/password-confirmation-field';
import { approveExchangeRateAction } from '../../../../../../lib/admin-mutations/exchange.server';
import { type ExchangeRateCasePageData } from '../page.loader';

export function ExchangeRateActionsSection({
  rate,
  canManage,
}: {
  rate: ExchangeRateCasePageData[`rate`];
  canManage: boolean;
}) {
  if (!canManage) {
    return null;
  }

  return (
    <section className="panel">
      <h2>Allowed actions</h2>
      {rate.actionControls.canApprove ? (
        <form action={approveExchangeRateAction.bind(null, rate.id)} className="formStack">
          <input type="hidden" name="version" value={String(rate.version)} />
          <input type="hidden" name="confirmed" value="false" />
          <label className="field">
            <span>Approval reason</span>
            <textarea name="reason" required maxLength={500} placeholder="Mandatory approval reason for audit." />
          </label>
          <label className="field">
            <span>Confirmation</span>
            <input type="checkbox" name="confirmed" value="true" required />
          </label>
          <PasswordConfirmationField />
          <button className="secondaryButton" type="submit" name="confirmedSubmit" value="true">
            Approve exchange rate
          </button>
        </form>
      ) : (
        <p className="muted">Only draft rates can be approved in this slice.</p>
      )}
    </section>
  );
}
