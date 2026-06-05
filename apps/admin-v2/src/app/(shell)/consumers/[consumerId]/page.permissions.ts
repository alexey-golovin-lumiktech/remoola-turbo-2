import { type ConsumerPageData } from './page.loader';
import { ADMIN_CAPABILITIES, hasAdminCapability } from '../../../../lib/admin-capabilities';

export type ConsumerPagePermissions = {
  canManageNotes: boolean;
  canManageFlags: boolean;
  canForceLogout: boolean;
  canSuspend: boolean;
  canResendEmail: boolean;
  canResendSignupVerification: boolean;
};

export function deriveConsumerPagePermissions(
  identity: ConsumerPageData[`identity`],
  consumer: ConsumerPageData[`consumer`],
): ConsumerPagePermissions {
  const canManageNotes = hasAdminCapability(identity, ADMIN_CAPABILITIES.consumersNotes);
  const canManageFlags = hasAdminCapability(identity, ADMIN_CAPABILITIES.consumersFlags);
  const canForceLogout = hasAdminCapability(identity, ADMIN_CAPABILITIES.consumersForceLogout);
  const canSuspend = hasAdminCapability(identity, ADMIN_CAPABILITIES.consumersSuspend);
  const canResendEmail = hasAdminCapability(identity, ADMIN_CAPABILITIES.consumersEmailResend);
  const canResendSignupVerification = canResendEmail && !consumer.verified;
  return {
    canManageNotes,
    canManageFlags,
    canForceLogout,
    canSuspend,
    canResendEmail,
    canResendSignupVerification,
  };
}
