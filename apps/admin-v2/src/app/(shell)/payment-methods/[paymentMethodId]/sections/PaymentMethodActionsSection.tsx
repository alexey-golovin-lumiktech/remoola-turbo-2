import {
  operatorFormActionsClass,
  operatorFormClass,
  operatorFormConfirmClass,
  operatorFormFieldsClass,
  operatorFormFullWidthCtaClass,
  operatorFormIntroClass,
  operatorFormSecondaryClass,
  operatorFormSectionClass,
} from '../../../../../components/ui-classes';
import {
  escalateDuplicatePaymentMethodAction,
  removeDefaultPaymentMethodAction,
  disablePaymentMethodAction,
} from '../../../../../lib/admin-mutations/payment-methods.server';
import { type PaymentMethodCasePageData } from '../page.loader';

export function PaymentMethodActionsSection({
  paymentMethod,
  canManage,
}: {
  paymentMethod: PaymentMethodCasePageData[`paymentMethod`];
  canManage: boolean;
}) {
  if (!canManage) {
    return null;
  }

  return (
    <section className="detailGrid">
      {paymentMethod.deletedAt ? (
        <article className="panel">
          <h2>Payment method actions</h2>
          <p className="muted">Soft-deleted methods stay investigation-only. Management actions are not available.</p>
        </article>
      ) : null}

      {!paymentMethod.deletedAt && paymentMethod.status !== `DISABLED` ? (
        <article className="panel">
          <h2>Disable</h2>
          <form action={disablePaymentMethodAction.bind(null, paymentMethod.id)} className={operatorFormClass}>
            <input type="hidden" name="version" value={String(paymentMethod.version)} />
            <input type="hidden" name="consumerId" value={paymentMethod.consumer.id} />
            <input type="hidden" name="confirmed" value="false" />
            <div className={operatorFormSectionClass}>
              <div className={operatorFormIntroClass}>
                <p className="text-sm font-medium text-white/90">Disable method</p>
                <p className="muted">Mandatory reason is recorded for audit and future operator review.</p>
              </div>
              <div className={operatorFormFieldsClass}>
                <label className="field">
                  <span>Reason</span>
                  <textarea name="reason" required maxLength={500} placeholder="Mandatory disable reason for audit." />
                </label>
              </div>
              {paymentMethod.defaultSelected ? (
                <div className={operatorFormSecondaryClass}>
                  <p className="muted">
                    This action also clears the default marker on the same method. A disabled method cannot remain the
                    default destination.
                  </p>
                </div>
              ) : null}
              <div className={operatorFormConfirmClass}>
                <label className="field">
                  <span>Confirmation</span>
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
                  Disable payment method
                </button>
              </div>
            </div>
          </form>
        </article>
      ) : null}

      {!paymentMethod.deletedAt && paymentMethod.defaultSelected ? (
        <article className="panel">
          <h2>Remove default</h2>
          <form action={removeDefaultPaymentMethodAction.bind(null, paymentMethod.id)} className={operatorFormClass}>
            <input type="hidden" name="version" value={String(paymentMethod.version)} />
            <input type="hidden" name="consumerId" value={paymentMethod.consumer.id} />
            <div className={operatorFormSectionClass}>
              <div className={operatorFormIntroClass}>
                <p className="text-sm font-medium text-white/90">Remove default marker</p>
                <p className="muted">Clears only the default marker. No other payment-method fields are changed.</p>
              </div>
              <div className={operatorFormActionsClass}>
                <button className={`secondaryButton ${operatorFormFullWidthCtaClass}`} type="submit">
                  Remove default marker
                </button>
              </div>
            </div>
          </form>
        </article>
      ) : null}

      {!paymentMethod.deletedAt &&
      paymentMethod.stripeFingerprint &&
      paymentMethod.fingerprintDuplicates.length > 0 &&
      !paymentMethod.duplicateEscalation ? (
        <article className="panel">
          <h2>Duplicate escalation</h2>
          <form
            action={escalateDuplicatePaymentMethodAction.bind(null, paymentMethod.id)}
            className={operatorFormClass}
          >
            <input type="hidden" name="version" value={String(paymentMethod.version)} />
            <input type="hidden" name="consumerId" value={paymentMethod.consumer.id} />
            <div className={operatorFormSectionClass}>
              <div className={operatorFormIntroClass}>
                <p className="text-sm font-medium text-white/90">Escalate fingerprint cohort</p>
                <p className="muted">
                  Creates one durable duplicate-escalation record for this method and fingerprint cohort.
                </p>
              </div>
              <div className={operatorFormActionsClass}>
                <button className={`secondaryButton ${operatorFormFullWidthCtaClass}`} type="submit">
                  Escalate duplicate fingerprint
                </button>
              </div>
            </div>
          </form>
        </article>
      ) : null}
    </section>
  );
}
