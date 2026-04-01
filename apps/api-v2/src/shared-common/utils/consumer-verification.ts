import { $Enums } from '@remoola/database-2';

export const STRIPE_IDENTITY_STATUS = {
  NOT_STARTED: `not_started`,
  PENDING_SUBMISSION: `pending_submission`,
  REQUIRES_INPUT: `requires_input`,
  VERIFIED: `verified`,
  CANCELED: `canceled`,
  REDACTED: `redacted`,
  REJECTED: `rejected`,
  MORE_INFO: `more_info`,
  FLAGGED: `flagged`,
} as const;

export type StripeIdentityStatus = (typeof STRIPE_IDENTITY_STATUS)[keyof typeof STRIPE_IDENTITY_STATUS];

type PersonalDetailsLike = {
  legalStatus?: string | null;
  taxId?: string | null;
  passportOrIdNumber?: string | null;
  phoneNumber?: string | null;
} | null;

export type ConsumerVerificationProjection = {
  accountType?: $Enums.AccountType | null;
  contractorKind?: $Enums.ContractorKind | null;
  legalVerified?: boolean | null;
  verificationStatus?: $Enums.VerificationStatus | null;
  stripeIdentityStatus?: string | null;
  stripeIdentitySessionId?: string | null;
  stripeIdentityLastErrorCode?: string | null;
  stripeIdentityLastErrorReason?: string | null;
  stripeIdentityStartedAt?: Date | null;
  stripeIdentityUpdatedAt?: Date | null;
  stripeIdentityVerifiedAt?: Date | null;
  personalDetails?: PersonalDetailsLike;
};

export type ConsumerVerificationState = {
  status: StripeIdentityStatus;
  canStart: boolean;
  profileComplete: boolean;
  legalVerified: boolean;
  effectiveVerified: boolean;
  reviewStatus: $Enums.VerificationStatus;
  stripeStatus: StripeIdentityStatus;
  sessionId: string | null;
  lastErrorCode: string | null;
  lastErrorReason: string | null;
  startedAt: string | null;
  updatedAt: string | null;
  verifiedAt: string | null;
};

const NEGATIVE_REVIEW_STATUSES = new Set<$Enums.VerificationStatus>([
  $Enums.VerificationStatus.REJECTED,
  $Enums.VerificationStatus.MORE_INFO,
  $Enums.VerificationStatus.FLAGGED,
]);

function toIsoOrNull(value?: Date | null): string | null {
  return value ? value.toISOString() : null;
}

function normalizeStripeStatus(status?: string | null): StripeIdentityStatus {
  switch (status) {
    case STRIPE_IDENTITY_STATUS.PENDING_SUBMISSION:
      return STRIPE_IDENTITY_STATUS.PENDING_SUBMISSION;
    case STRIPE_IDENTITY_STATUS.REQUIRES_INPUT:
      return STRIPE_IDENTITY_STATUS.REQUIRES_INPUT;
    case STRIPE_IDENTITY_STATUS.VERIFIED:
      return STRIPE_IDENTITY_STATUS.VERIFIED;
    case STRIPE_IDENTITY_STATUS.CANCELED:
      return STRIPE_IDENTITY_STATUS.CANCELED;
    case STRIPE_IDENTITY_STATUS.REDACTED:
      return STRIPE_IDENTITY_STATUS.REDACTED;
    default:
      return STRIPE_IDENTITY_STATUS.NOT_STARTED;
  }
}

export function isConsumerProfileCompleteForVerification(
  consumer: ConsumerVerificationProjection | null | undefined,
): boolean {
  if (!consumer) return false;
  const pd = consumer.personalDetails;
  const isIndividualContractor =
    consumer.accountType === $Enums.AccountType.CONTRACTOR &&
    consumer.contractorKind === $Enums.ContractorKind.INDIVIDUAL;

  return Boolean(
    pd &&
    (isIndividualContractor
      ? pd.legalStatus && pd.taxId?.trim() && pd.passportOrIdNumber?.trim()
      : pd.taxId?.trim() && pd.phoneNumber?.trim()),
  );
}

export function isConsumerVerificationEffective(consumer: ConsumerVerificationProjection | null | undefined): boolean {
  if (!consumer) return false;
  const reviewStatus = consumer.verificationStatus ?? $Enums.VerificationStatus.PENDING;
  return Boolean(consumer.legalVerified) && !NEGATIVE_REVIEW_STATUSES.has(reviewStatus);
}

export function buildConsumerVerificationState(
  consumer: ConsumerVerificationProjection | null | undefined,
): ConsumerVerificationState {
  const reviewStatus = consumer?.verificationStatus ?? $Enums.VerificationStatus.PENDING;
  const profileComplete = isConsumerProfileCompleteForVerification(consumer);
  const effectiveVerified = isConsumerVerificationEffective(consumer);
  const stripeStatus = normalizeStripeStatus(consumer?.stripeIdentityStatus);

  let status = stripeStatus;
  if (effectiveVerified) {
    status = STRIPE_IDENTITY_STATUS.VERIFIED;
  } else if (reviewStatus === $Enums.VerificationStatus.REJECTED) {
    status = STRIPE_IDENTITY_STATUS.REJECTED;
  } else if (reviewStatus === $Enums.VerificationStatus.MORE_INFO) {
    status = STRIPE_IDENTITY_STATUS.MORE_INFO;
  } else if (reviewStatus === $Enums.VerificationStatus.FLAGGED) {
    status = STRIPE_IDENTITY_STATUS.FLAGGED;
  }

  return {
    status,
    canStart: profileComplete && !effectiveVerified,
    profileComplete,
    legalVerified: Boolean(consumer?.legalVerified),
    effectiveVerified,
    reviewStatus,
    stripeStatus,
    sessionId: consumer?.stripeIdentitySessionId ?? null,
    lastErrorCode: consumer?.stripeIdentityLastErrorCode ?? null,
    lastErrorReason: consumer?.stripeIdentityLastErrorReason ?? null,
    startedAt: toIsoOrNull(consumer?.stripeIdentityStartedAt),
    updatedAt: toIsoOrNull(consumer?.stripeIdentityUpdatedAt),
    verifiedAt: toIsoOrNull(consumer?.stripeIdentityVerifiedAt),
  };
}
