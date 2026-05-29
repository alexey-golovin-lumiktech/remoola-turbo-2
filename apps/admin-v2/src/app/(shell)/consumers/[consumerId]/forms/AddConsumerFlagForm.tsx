import { InlineErrorForm } from '../../../../../components/inline-error-form';
import {
  operatorFormActionsClass,
  operatorFormClass,
  operatorFormFieldsClass,
  operatorFormFullWidthCtaClass,
  operatorFormSectionClass,
} from '../../../../../components/ui-classes';
import { addConsumerFlagFormAction } from '../../../../../lib/admin-mutations/consumers.server';

export function AddConsumerFlagForm({ consumerId }: { consumerId: string }) {
  return (
    <InlineErrorForm action={addConsumerFlagFormAction.bind(null, consumerId)} className={operatorFormClass}>
      <div className={operatorFormSectionClass}>
        <div className={operatorFormFieldsClass}>
          <label className="field">
            <span>Flag</span>
            <input name="flag" required placeholder="needs_review" />
          </label>
          <label className="field">
            <span>Reason</span>
            <textarea name="reason" placeholder="Why this consumer is flagged" />
          </label>
        </div>
        <div className={operatorFormActionsClass}>
          <button className={`primaryButton ${operatorFormFullWidthCtaClass}`} type="submit">
            Add flag
          </button>
        </div>
      </div>
    </InlineErrorForm>
  );
}
