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
import { refundPaymentAction } from '../../../../../lib/admin-mutations/payments.server';

export function RefundPaymentForm({
  paymentCaseId,
  payerId,
  requesterId,
}: {
  paymentCaseId: string;
  payerId: string | null;
  requesterId: string | null;
}) {
  return (
    <Panel title="Refund">
      <form action={refundPaymentAction.bind(null, paymentCaseId, payerId, requesterId)} className={operatorFormClass}>
        <div className={operatorFormSectionClass}>
          <div className={operatorFormIntroClass}>
            <p className="text-sm font-medium text-white/90">Issue refund</p>
            <p className={mutedTextClass}>
              Initiates a Stripe refund for this payment. Leave amount blank to reverse the remaining reversible amount
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
                placeholder="Leave blank to reverse remaining reversible amount"
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
              <span className={fieldLabelClass}>I confirm this refund is correct</span>
            </label>
          </div>
          <div className={operatorFormActionsClass}>
            <button className={`${dangerButtonClass} ${operatorFormFullWidthCtaClass}`} type="submit">
              Issue refund
            </button>
          </div>
        </div>
      </form>
    </Panel>
  );
}
