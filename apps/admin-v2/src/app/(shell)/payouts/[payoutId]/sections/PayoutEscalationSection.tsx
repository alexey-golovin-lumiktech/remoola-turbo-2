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
  stackClass,
  textAreaClass,
} from '../../../../../components/ui-classes';
import { EMPTY_VALUE, formatDateTime } from '../../../../../lib/admin-format';
import { escalatePayoutAction } from '../../../../../lib/admin-mutations/payouts.server';
import { type PayoutCasePageData } from '../page.loader';
import { type PayoutCasePagePermissions } from '../page.permissions';

export function PayoutEscalationSection({
  payoutCase,
  permissions,
}: {
  payoutCase: PayoutCasePageData[`payoutCase`];
  permissions: Pick<PayoutCasePagePermissions, `canManageEscalation` | `canSubmitEscalation`>;
}) {
  const { canManageEscalation, canSubmitEscalation } = permissions;
  if (!canManageEscalation && !payoutCase.payoutEscalation) {
    return null;
  }
  return (
    <section className="detailGrid">
      {canManageEscalation ? (
        <Panel title="Payout escalation marker">
          {canSubmitEscalation ? (
            <form action={escalatePayoutAction.bind(null, payoutCase.id)} className={operatorFormClass}>
              <input type="hidden" name="version" value={String(payoutCase.version)} />
              <input type="hidden" name="consumerId" value={payoutCase.consumer.id} />
              <input type="hidden" name="confirmed" value="false" />
              <div className={operatorFormSectionClass}>
                <div className={operatorFormIntroClass}>
                  <p className="text-sm font-medium text-white/90">Escalate payout</p>
                  <p className={mutedTextClass}>
                    Creates a marker only. It does not change payout state, ledger outcomes, destination links, or any
                    downstream execution.
                  </p>
                </div>
                <div className={operatorFormFieldsClass}>
                  <label className={fieldClass}>
                    <span className={fieldLabelClass}>Reason</span>
                    <textarea
                      className={textAreaClass}
                      name="reason"
                      maxLength={500}
                      placeholder="Optional operational context for the audit trail."
                    />
                  </label>
                </div>
                <div className={operatorFormConfirmClass}>
                  <label className={checkboxFieldClass}>
                    <input className={checkboxInputClass} type="checkbox" name="confirmed" value="true" required />
                    <span className={fieldLabelClass}>Confirmation</span>
                  </label>
                </div>
                <div className={operatorFormActionsClass}>
                  <button
                    className={`${dangerButtonClass} ${operatorFormFullWidthCtaClass}`}
                    type="submit"
                    name="confirmedSubmit"
                    value="true"
                  >
                    Escalate payout
                  </button>
                </div>
              </div>
            </form>
          ) : (
            <div className={stackClass}>
              <p className={mutedTextClass}>
                {payoutCase.actionControls.escalateBlockedReason ??
                  `A payout escalation marker is not available for this case.`}
              </p>
            </div>
          )}
        </Panel>
      ) : null}

      {payoutCase.payoutEscalation ? (
        <Panel title="Active payout escalation marker">
          <div className={stackClass}>
            <p className={mutedTextClass}>
              Escalated by:{` `}
              {payoutCase.payoutEscalation.escalatedBy.email ?? payoutCase.payoutEscalation.escalatedBy.id}
            </p>
            <p className={mutedTextClass}>Created: {formatDateTime(payoutCase.payoutEscalation.createdAt)}</p>
            <p className={mutedTextClass}>Confirmed: {payoutCase.payoutEscalation.confirmed ? `Yes` : `No`}</p>
            <p className={mutedTextClass}>Reason: {payoutCase.payoutEscalation.reason ?? EMPTY_VALUE}</p>
          </div>
        </Panel>
      ) : null}
    </section>
  );
}
