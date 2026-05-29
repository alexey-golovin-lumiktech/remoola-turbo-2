import {
  operatorFormActionsClass,
  operatorFormClass,
  operatorFormConfirmClass,
  operatorFormFieldsClass,
  operatorFormFullWidthCtaClass,
  operatorFormIntroClass,
  operatorFormSectionClass,
} from '../../../../../components/ui-classes';
import { suspendConsumerAction } from '../../../../../lib/admin-mutations/consumers.server';

export function SuspendConsumerForm({ consumerId }: { consumerId: string }) {
  return (
    <form action={suspendConsumerAction.bind(null, consumerId)} className={operatorFormClass}>
      <div className={operatorFormSectionClass}>
        <div className={operatorFormIntroClass}>
          <p className="text-sm font-medium text-white/90">Suspend consumer</p>
          <p className="muted">Reason is stored in audit history and used in the suspension email.</p>
        </div>
        <div className={operatorFormFieldsClass}>
          <label className="field">
            <span>Suspension reason</span>
            <textarea
              name="reason"
              required
              maxLength={500}
              placeholder="Reason shown in audit history and the suspension email."
            />
          </label>
        </div>
        <div className={operatorFormConfirmClass}>
          <label className="field">
            <span>Confirm</span>
            <input type="checkbox" name="confirmed" value="true" required />
          </label>
        </div>
        <div className={operatorFormActionsClass}>
          <button
            className={`dangerButton ${operatorFormFullWidthCtaClass}`}
            type="submit"
            name="confirmedSubmit"
            value="true"
          >
            Suspend consumer
          </button>
        </div>
      </div>
    </form>
  );
}
