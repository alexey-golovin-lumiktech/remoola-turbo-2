import { ActionGhost } from '../../../../../components/action-ghost';
import { ActionPrimary } from '../../../../../components/action-primary';
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
} from '../../../../../components/ui-classes';
import { forceLogoutConsumerAction } from '../../../../../lib/admin-mutations/consumers.server';
import {
  approveVerificationAction,
  flagVerificationAction,
  rejectVerificationAction,
  requestInfoVerificationAction,
} from '../../../../../lib/admin-mutations/verification.server';
import { type VerificationCasePageData } from '../page.loader';

export function VerificationDecisionActions({
  verificationCase,
}: {
  verificationCase: VerificationCasePageData[`verificationCase`];
}) {
  if (!verificationCase.decisionControls.canDecide && !verificationCase.decisionControls.canForceLogout) {
    return null;
  }
  return (
    <section className="detailGrid">
      {verificationCase.decisionControls.canDecide ? (
        <>
          <Panel title="Approve">
            <form action={approveVerificationAction.bind(null, verificationCase.id)} className={operatorFormClass}>
              <input type="hidden" name="version" value={String(verificationCase.version)} />
              <input type="hidden" name="confirmed" value="false" />
              <div className={operatorFormSectionClass}>
                <div className={operatorFormIntroClass}>
                  <p className="text-sm font-medium text-white/90">Approve verification</p>
                  <p className={mutedTextClass}>Use when the current identity and document package is complete.</p>
                </div>
                <div className={operatorFormFieldsClass}>
                  <label className={fieldClass}>
                    <span className={fieldLabelClass}>Reason (optional)</span>
                    <textarea className={textAreaClass} name="reason" placeholder="Optional approval note" />
                  </label>
                </div>
                <div className={operatorFormConfirmClass}>
                  <label className={checkboxFieldClass}>
                    <input className={checkboxInputClass} type="checkbox" name="confirmed" value="true" required />
                    <span className={fieldLabelClass}>Confirmation</span>
                  </label>
                </div>
                <div className={operatorFormActionsClass}>
                  <ActionPrimary type="submit" className={operatorFormFullWidthCtaClass}>
                    Approve verification
                  </ActionPrimary>
                </div>
              </div>
            </form>
          </Panel>
          <Panel title="Request Info">
            <form action={requestInfoVerificationAction.bind(null, verificationCase.id)} className={operatorFormClass}>
              <input type="hidden" name="version" value={String(verificationCase.version)} />
              <input type="hidden" name="confirmed" value="false" />
              <div className={operatorFormSectionClass}>
                <div className={operatorFormIntroClass}>
                  <p className="text-sm font-medium text-white/90">Request additional information</p>
                  <p className={mutedTextClass}>Use when the review is blocked by missing consumer context.</p>
                </div>
                <div className={operatorFormFieldsClass}>
                  <label className={fieldClass}>
                    <span className={fieldLabelClass}>Reason (optional)</span>
                    <textarea
                      className={textAreaClass}
                      name="reason"
                      placeholder="What information is needed from the consumer"
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
                  <ActionGhost type="submit" className={operatorFormFullWidthCtaClass}>
                    Request more info
                  </ActionGhost>
                </div>
              </div>
            </form>
          </Panel>
          <Panel title="Flag">
            <form action={flagVerificationAction.bind(null, verificationCase.id)} className={operatorFormClass}>
              <input type="hidden" name="version" value={String(verificationCase.version)} />
              <input type="hidden" name="confirmed" value="false" />
              <div className={operatorFormSectionClass}>
                <div className={operatorFormIntroClass}>
                  <p className="text-sm font-medium text-white/90">Flag verification</p>
                  <p className={mutedTextClass}>
                    Use for suspicious or escalated cases that need extra operator attention.
                  </p>
                </div>
                <div className={operatorFormFieldsClass}>
                  <label className={fieldClass}>
                    <span className={fieldLabelClass}>Reason (optional)</span>
                    <textarea className={textAreaClass} name="reason" placeholder="Optional flag note" />
                  </label>
                </div>
                <div className={operatorFormConfirmClass}>
                  <label className={checkboxFieldClass}>
                    <input className={checkboxInputClass} type="checkbox" name="confirmed" value="true" required />
                    <span className={fieldLabelClass}>Confirmation</span>
                  </label>
                </div>
                <div className={operatorFormActionsClass}>
                  <ActionGhost type="submit" className={operatorFormFullWidthCtaClass}>
                    Flag verification
                  </ActionGhost>
                </div>
              </div>
            </form>
          </Panel>
          <Panel title="Reject">
            <form action={rejectVerificationAction.bind(null, verificationCase.id)} className={operatorFormClass}>
              <input type="hidden" name="version" value={String(verificationCase.version)} />
              <input type="hidden" name="confirmed" value="false" />
              <div className={operatorFormSectionClass}>
                <div className={operatorFormIntroClass}>
                  <p className="text-sm font-medium text-white/90">Reject verification</p>
                  <p className={mutedTextClass}>
                    Use only when the review outcome is decisively negative and auditable.
                  </p>
                </div>
                <div className={operatorFormFieldsClass}>
                  <label className={fieldClass}>
                    <span className={fieldLabelClass}>Reason</span>
                    <textarea
                      className={textAreaClass}
                      name="reason"
                      required
                      placeholder="Reject reason is required"
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
                    Reject verification
                  </button>
                </div>
              </div>
            </form>
          </Panel>
        </>
      ) : null}

      {verificationCase.decisionControls.canForceLogout ? (
        <Panel title="Force Logout">
          <form action={forceLogoutConsumerAction.bind(null, verificationCase.id)} className={operatorFormClass}>
            <input type="hidden" name="confirmed" value="false" />
            <div className={operatorFormSectionClass}>
              <div className={operatorFormIntroClass}>
                <p className="text-sm font-medium text-white/90">Revoke all consumer sessions</p>
                <p className={mutedTextClass}>
                  This action is destructive and should be used only for active risk containment.
                </p>
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
                  Revoke all consumer sessions
                </button>
              </div>
            </div>
          </form>
        </Panel>
      ) : null}
    </section>
  );
}
