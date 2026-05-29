import { type ConsumerPageData } from './page.loader';

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
  const canManageNotes = identity?.capabilities.includes(`consumers.notes`) ?? false;
  const canManageFlags = identity?.capabilities.includes(`consumers.flags`) ?? false;
  const canForceLogout = identity?.capabilities.includes(`consumers.force_logout`) ?? false;
  const canSuspend = identity?.capabilities.includes(`consumers.suspend`) ?? false;
  const canResendEmail = identity?.capabilities.includes(`consumers.email_resend`) ?? false;
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
