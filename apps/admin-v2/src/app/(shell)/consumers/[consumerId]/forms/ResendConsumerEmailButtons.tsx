import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import {
  operatorFormActionsClass,
  operatorFormFullWidthCtaClass,
  operatorFormIntroClass,
  operatorFormSecondaryClass,
} from '../../../../../components/ui-classes';
import { resendConsumerEmailAction } from '../../../../../lib/admin-mutations/consumers.server';

export function ResendConsumerEmailButtons({
  consumerId,
  canResendSignupVerification,
}: {
  consumerId: string;
  canResendSignupVerification: boolean;
}) {
  return (
    <div className={operatorFormSecondaryClass}>
      <div className={operatorFormIntroClass}>
        <p className="text-sm font-medium text-white/90">Resend support emails</p>
        <p className="muted">Secondary communication actions stay separated from the destructive flow.</p>
      </div>
      <div className={operatorFormActionsClass}>
        {canResendSignupVerification ? (
          <form action={resendConsumerEmailAction.bind(null, consumerId)}>
            <input type="hidden" name="emailKind" value="signup_verification" />
            <input type="hidden" name="appScope" value={CURRENT_CONSUMER_APP_SCOPE} />
            <button className={`secondaryButton ${operatorFormFullWidthCtaClass}`} type="submit">
              Resend signup verification email
            </button>
          </form>
        ) : null}
        <form action={resendConsumerEmailAction.bind(null, consumerId)}>
          <input type="hidden" name="emailKind" value="password_recovery" />
          <input type="hidden" name="appScope" value={CURRENT_CONSUMER_APP_SCOPE} />
          <button className={`secondaryButton ${operatorFormFullWidthCtaClass}`} type="submit">
            Resend password recovery email
          </button>
        </form>
      </div>
    </div>
  );
}
