export type DashboardVerificationState = {
  effectiveVerified: boolean;
  profileComplete: boolean;
  status?: string | null;
  canStart?: boolean;
};

export type VerificationBannerState = {
  headline: string;
  copy: string;
  badge: string;
  icon: string;
  panelClass: string;
  iconClass: string;
  badgeClass: string;
};

type VerificationBannerAction =
  | {
      kind: `button`;
      label: string;
    }
  | {
      kind: `link`;
      label: string;
      href: string;
    }
  | null;

export function getVerificationBannerState(
  verification: DashboardVerificationState | undefined,
  dashboardUnavailable: boolean,
): VerificationBannerState {
  if (dashboardUnavailable) {
    return {
      headline: `Verification status unavailable`,
      copy: `Reconnect to the live dashboard feed to refresh verification progress and next steps.`,
      badge: `Unavailable`,
      icon: `?`,
      panelClass: `border-transparent bg-[var(--app-warning-soft)]`,
      iconClass: `bg-[var(--app-warning-text)] text-[var(--app-primary-contrast)] shadow-[var(--app-shadow)]`,
      badgeClass: `border-transparent bg-[var(--app-warning-soft)] text-[var(--app-warning-text)]`,
    };
  }

  if (verification?.effectiveVerified) {
    return {
      headline: `Identity verified`,
      copy: `Your verification is complete and higher account access is available.`,
      badge: `Verified`,
      icon: `✓`,
      panelClass: `border-transparent bg-[var(--app-success-soft)]`,
      iconClass: `bg-[var(--app-success-text)] text-[var(--app-primary-contrast)] shadow-[var(--app-shadow)]`,
      badgeClass: `border-transparent bg-[var(--app-success-soft)] text-[var(--app-success-text)]`,
    };
  }

  switch (verification?.status) {
    case `requires_input`:
      return {
        headline: `Verification needs attention`,
        copy: `Your verification needs additional information before higher account access can be enabled.`,
        badge: `Action required`,
        icon: `!`,
        panelClass: `border-transparent bg-[var(--app-danger-soft)]`,
        iconClass: `bg-[var(--app-danger-text)] text-[var(--app-primary-contrast)] shadow-[var(--app-shadow)]`,
        badgeClass: `border-transparent bg-[var(--app-danger-soft)] text-[var(--app-danger-text)]`,
      };
    case `more_info`:
      return {
        headline: `More information required`,
        copy: `More verification details are needed before higher account access can be enabled.`,
        badge: `More info required`,
        icon: `!`,
        panelClass: `border-transparent bg-[var(--app-danger-soft)]`,
        iconClass: `bg-[var(--app-danger-text)] text-[var(--app-primary-contrast)] shadow-[var(--app-shadow)]`,
        badgeClass: `border-transparent bg-[var(--app-danger-soft)] text-[var(--app-danger-text)]`,
      };
    case `rejected`:
      return {
        headline: `Verification not approved`,
        copy: `Your last verification attempt was not approved yet. Review the requested details before trying again.`,
        badge: `Not approved`,
        icon: `!`,
        panelClass: `border-transparent bg-[var(--app-danger-soft)]`,
        iconClass: `bg-[var(--app-danger-text)] text-[var(--app-primary-contrast)] shadow-[var(--app-shadow)]`,
        badgeClass: `border-transparent bg-[var(--app-danger-soft)] text-[var(--app-danger-text)]`,
      };
    case `flagged`:
      return {
        headline: `Verification under review`,
        copy: `Your verification needs additional review before higher account access can be enabled.`,
        badge: `Review required`,
        icon: `!`,
        panelClass: `border-transparent bg-[var(--app-danger-soft)]`,
        iconClass: `bg-[var(--app-danger-text)] text-[var(--app-primary-contrast)] shadow-[var(--app-shadow)]`,
        badgeClass: `border-transparent bg-[var(--app-danger-soft)] text-[var(--app-danger-text)]`,
      };
    case `pending_submission`:
      return {
        headline: `Finish identity verification`,
        copy: `Your profile is ready. Finish the identity verification flow to submit it for review.`,
        badge: `In progress`,
        icon: `!`,
        panelClass: `border-transparent bg-[var(--app-warning-soft)]`,
        iconClass: `bg-[var(--app-warning-text)] text-[var(--app-primary-contrast)] shadow-[var(--app-shadow)]`,
        badgeClass: `border-transparent bg-[var(--app-warning-soft)] text-[var(--app-warning-text)]`,
      };
    case `canceled`:
    case `redacted`:
      return {
        headline: `Verification needs to be restarted`,
        copy: `Your previous verification session is no longer active. Start verification again to unlock higher account access.`,
        badge: `Restart needed`,
        icon: `!`,
        panelClass: `border-transparent bg-[var(--app-warning-soft)]`,
        iconClass: `bg-[var(--app-warning-text)] text-[var(--app-primary-contrast)] shadow-[var(--app-shadow)]`,
        badgeClass: `border-transparent bg-[var(--app-warning-soft)] text-[var(--app-warning-text)]`,
      };
    case `not_started`:
    default:
      if (verification?.profileComplete) {
        return {
          headline: `Verification ready to start`,
          copy: `Your profile is ready. Start identity verification to unlock higher account access.`,
          badge: `Not started`,
          icon: `!`,
          panelClass: `border-transparent bg-[var(--app-warning-soft)]`,
          iconClass: `bg-[var(--app-warning-text)] text-[var(--app-primary-contrast)] shadow-[var(--app-shadow)]`,
          badgeClass: `border-transparent bg-[var(--app-warning-soft)] text-[var(--app-warning-text)]`,
        };
      }

      return {
        headline: `Finish your profile to start verification`,
        copy: `Complete the required profile details before starting identity verification.`,
        badge: `Profile incomplete`,
        icon: `!`,
        panelClass: `border-transparent bg-[var(--app-warning-soft)]`,
        iconClass: `bg-[var(--app-warning-text)] text-[var(--app-primary-contrast)] shadow-[var(--app-shadow)]`,
        badgeClass: `border-transparent bg-[var(--app-warning-soft)] text-[var(--app-warning-text)]`,
      };
  }
}

export function getVerificationBannerAction(
  verification: DashboardVerificationState | undefined,
  dashboardUnavailable: boolean,
): VerificationBannerAction {
  if (dashboardUnavailable || !verification || verification.effectiveVerified) {
    return null;
  }

  if (!verification.profileComplete) {
    return {
      kind: `link`,
      href: `/settings`,
      label: `Complete profile`,
    };
  }

  if (verification.canStart === false) {
    return null;
  }

  switch (verification.status) {
    case `pending_submission`:
    case `requires_input`:
    case `more_info`:
      return {
        kind: `button`,
        label: `Continue verification`,
      };
    case `canceled`:
    case `redacted`:
      return {
        kind: `button`,
        label: `Restart verification`,
      };
    case `rejected`:
    case `flagged`:
      return {
        kind: `button`,
        label: `Retry verification`,
      };
    case `not_started`:
    default:
      return {
        kind: `button`,
        label: `Start verification`,
      };
  }
}
