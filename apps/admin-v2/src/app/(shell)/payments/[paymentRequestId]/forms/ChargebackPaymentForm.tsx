import { PasswordConfirmationField } from '../../../../../components/admin-form-fields/password-confirmation-field';
import { Panel } from '../../../../../components/panel';
import {
  checkboxFieldClass,
  checkboxInputClass,
  dangerButtonClass,
  fieldClass,
  fieldLabelClass,
  mutedTextClass,
  operatorFormActionsClass,
  operatorFormClass,
  operatorFormConfirmClass,
  operatorFormFieldsClass,
  operatorFormFullWidthCtaClass,
  operatorFormIntroClass,
  operatorFormSectionClass,
  textAreaClass,
  textInputClass,
} from '../../../../../components/ui-classes';
import { chargebackPaymentAction } from '../../../../../lib/admin-mutations/payments.server';

export function ChargebackPaymentForm({
  paymentCaseId,
  payerId,
  requesterId,
}: {
  paymentCaseId: string;
  payerId: string | null;
  requesterId: string | null;
}) {
  return (
    <Panel title="Chargeback">
      <form
        action={chargebackPaymentAction.bind(null, paymentCaseId, payerId, requesterId)}
        className={operatorFormClass}
      >
        <div className={operatorFormSectionClass}>
          <div className={operatorFormIntroClass}>
            <p className="text-sm font-medium text-white/90">Record chargeback</p>
            <p className={mutedTextClass}>
              Records a manual chargeback for this payment. Leave amount blank to apply the remaining reversible amount
              (prior partial reversals reduce this). Requires step-up password confirmation.
            </p>
          </div>
          <div className={operatorFormFieldsClass}>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Amount (optional)</span>
              <input
                className={textInputClass}
                name="amount"
                type="number"
                min="0.01"
                step="0.01"
                placeholder="Leave blank to apply remaining reversible amount"
              />
            </label>
            <label className={fieldClass}>
              <span className={fieldLabelClass}>Reason (optional)</span>
              <textarea
                className={textAreaClass}
                name="reason"
                maxLength={500}
                placeholder="Optional context for the audit trail."
              />
            </label>
            <PasswordConfirmationField />
          </div>
          <div className={operatorFormConfirmClass}>
            <label className={checkboxFieldClass}>
              <input className={checkboxInputClass} type="checkbox" name="confirmed" value="true" required />
              <span className={fieldLabelClass}>I confirm this chargeback is correct</span>
            </label>
          </div>
          <div className={operatorFormActionsClass}>
            <button className={`${dangerButtonClass} ${operatorFormFullWidthCtaClass}`} type="submit">
              Record chargeback
            </button>
          </div>
        </div>
      </form>
    </Panel>
  );
}
