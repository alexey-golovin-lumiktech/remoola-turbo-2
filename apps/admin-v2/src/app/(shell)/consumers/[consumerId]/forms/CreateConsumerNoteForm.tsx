import { InlineErrorForm } from '../../../../../components/inline-error-form';
import {
  operatorFormActionsClass,
  operatorFormClass,
  operatorFormFieldsClass,
  operatorFormFullWidthCtaClass,
  operatorFormSectionClass,
} from '../../../../../components/ui-classes';
import { createConsumerNoteFormAction } from '../../../../../lib/admin-mutations/consumers.server';

export function CreateConsumerNoteForm({ consumerId }: { consumerId: string }) {
  return (
    <InlineErrorForm action={createConsumerNoteFormAction.bind(null, consumerId)} className={operatorFormClass}>
      <div className={operatorFormSectionClass}>
        <div className={operatorFormFieldsClass}>
          <label className="field">
            <span>Content</span>
            <textarea name="content" required placeholder="Investigation note, escalation context, next step..." />
          </label>
        </div>
        <div className={operatorFormActionsClass}>
          <button className={`primaryButton ${operatorFormFullWidthCtaClass}`} type="submit">
            Save note
          </button>
        </div>
      </div>
    </InlineErrorForm>
  );
}
