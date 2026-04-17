import { THEME, THEMES, type TTheme } from '@remoola/api-types';

export type SettingsVerificationCardState = {
  badge: string;
  title: string;
  description: string;
  toneClassName: string;
  showAction: boolean;
};

type SettingsVerification = {
  effectiveVerified: boolean;
  profileComplete: boolean;
  status: string;
  canStart: boolean;
  reviewStatus: string;
  lastErrorReason: string | null;
};

export function normalizeText(value: string) {
  return value.trim();
}

export function normalizePhone(value: string) {
  const trimmed = value.trimStart();
  const digits = trimmed.replace(/\D/g, ``).slice(0, 15);
  if (!digits) return ``;
  return trimmed.startsWith(`+`) ? `+${digits}` : digits;
}

export function normalizeTheme(value: string | null | undefined): TTheme {
  return THEMES.includes(value as TTheme) ? (value as TTheme) : THEME.SYSTEM;
}

export function humanizeStatus(value: string | null | undefined, fallback = `Unknown`) {
  if (!value) {
    return fallback;
  }

  const normalized = value.replaceAll(`_`, ` `).toLowerCase();
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}

export function getSettingsVerificationCardState(
  verification: SettingsVerification | null | undefined,
): SettingsVerificationCardState {
  if (!verification) {
    return {
      badge: `Unavailable`,
      title: `Verification status unavailable`,
      description: `We couldn't load your verification state right now. Refresh the page to try again.`,
      toneClassName: `border-[color:var(--app-border)] bg-[var(--app-surface-muted)]`,
      showAction: false,
    };
  }

  const reviewStatus = verification.reviewStatus?.toLowerCase();

  if (verification.effectiveVerified) {
    return {
      badge: `Verified`,
      title: `Account verified`,
      description: `Your identity check is complete and full account functionality is available.`,
      toneClassName: `border-transparent bg-[var(--app-success-soft)]`,
      showAction: false,
    };
  }

  if (reviewStatus === `pending`) {
    return {
      badge: `In review`,
      title: `Verification in review`,
      description: `Your submitted details are being reviewed. We'll update your status as soon as processing finishes.`,
      toneClassName: `border-transparent bg-[var(--app-warning-soft)]`,
      showAction: false,
    };
  }

  if (!verification.profileComplete && verification.canStart === false) {
    return {
      badge: `Profile incomplete`,
      title: `Complete your profile first`,
      description: `Add the missing profile details below before starting identity verification.`,
      toneClassName: `border-transparent bg-[var(--app-warning-soft)]`,
      showAction: false,
    };
  }

  if (verification.canStart) {
    switch (verification.status) {
      case `requires_input`:
      case `more_info`:
        return {
          badge: `Action required`,
          title: `Verification needs attention`,
          description:
            verification.lastErrorReason ??
            `Additional verification details are required before higher account access can be enabled.`,
          toneClassName: `border-transparent bg-[var(--app-danger-soft)]`,
          showAction: true,
        };
      case `pending_submission`:
        return {
          badge: `In progress`,
          title: `Continue your verification`,
          description: `Your profile is ready. Resume the verification flow and submit the remaining details.`,
          toneClassName: `border-transparent bg-[var(--app-warning-soft)]`,
          showAction: true,
        };
      case `rejected`:
      case `flagged`:
        return {
          badge: `Needs retry`,
          title: `Verification needs to be retried`,
          description:
            verification.lastErrorReason ?? `Review the requested details and retry verification to continue.`,
          toneClassName: `border-transparent bg-[var(--app-danger-soft)]`,
          showAction: true,
        };
      default:
        return {
          badge: humanizeStatus(verification.status, `Not started`),
          title: `Start account verification`,
          description: `Verify your identity to unlock the full set of payment and account capabilities.`,
          toneClassName: `border-transparent bg-[var(--app-warning-soft)]`,
          showAction: true,
        };
    }
  }

  return {
    badge: humanizeStatus(verification.status, `Unknown`),
    title: `Verification status: ${humanizeStatus(verification.status, `Unknown`)}`,
    description: `We'll show your next verification step here as soon as it becomes available.`,
    toneClassName: `border-[color:var(--app-border)] bg-[var(--app-surface-muted)]`,
    showAction: false,
  };
}

export function getChangedTextField(current: string, initial: string) {
  const normalizedCurrent = normalizeText(current);
  const normalizedInitial = normalizeText(initial);
  if (normalizedCurrent === normalizedInitial) {
    return undefined;
  }
  return normalizedCurrent;
}

export function getChangedPhoneField(current: string, initial: string) {
  const normalizedCurrent = normalizePhone(current);
  const normalizedInitial = normalizePhone(initial);
  if (normalizedCurrent === normalizedInitial) {
    return undefined;
  }
  return normalizedCurrent;
}
