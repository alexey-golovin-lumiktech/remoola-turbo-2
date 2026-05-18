import { type ConsumerAppScope } from '@remoola/api-types';
import { type ConsumerModel } from '@remoola/database-2';

type AdminAuthActionContext = { ipAddress?: string | null; userAgent?: string | null };

export const CONSUMER_ADMIN_AUTH_ACTIONS = Symbol(`CONSUMER_ADMIN_AUTH_ACTIONS`);

export type ConsumerAdminAuthActionsPort = {
  revokeAllSessionsByConsumerIdAndAudit(identityId: ConsumerModel[`id`], ctx?: AdminAuthActionContext): Promise<void>;
  resendSignupVerificationEmail(consumerId: string, appScope: ConsumerAppScope): Promise<boolean>;
  resendPasswordRecoveryEmail(
    consumerId: string,
    appScope: ConsumerAppScope,
  ): Promise<{ requestedKind: `password_recovery`; dispatchedKind: `password_reset` | `google_signin_recovery` }>;
  sendConsumerSuspensionEmail(consumerId: string, reason: string): Promise<boolean>;
};
