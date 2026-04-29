import { $Enums, type Prisma } from '@remoola/database-2';

export const FIXTURE_NAMESPACE = `fixture-admin-v2`;
const FIXTURE_SEED_VERSION = `2026-04-admin-v2-v1`;

type NamedAt = {
  createdAt: Date;
  updatedAt?: Date;
};

export type ScenarioAdmin = NamedAt & {
  key: string;
  email: string;
  password: string;
  type: $Enums.AdminType;
};

export type ScenarioContact = NamedAt & {
  email: string;
  name: string;
  address: Prisma.InputJsonValue;
};

export type ScenarioPaymentMethod = NamedAt & {
  key: string;
  type: $Enums.PaymentMethodType;
  stripePaymentMethodId: string;
  stripeFingerprint: string;
  defaultSelected: boolean;
  brand?: string | null;
  last4?: string | null;
  expMonth?: string | null;
  expYear?: string | null;
  bankName?: string | null;
  bankLast4?: string | null;
  bankCountry?: string | null;
  bankCurrency?: $Enums.CurrencyCode | null;
  serviceFee: number;
  billingEmail?: string | null;
  billingName?: string | null;
  billingPhone?: string | null;
};

export type ScenarioResource = NamedAt & {
  key: string;
  originalName: string;
  access: $Enums.ResourceAccess;
  mimetype: string;
  size: number;
  bucket: string;
  storageKey: string;
  downloadUrl: string;
  tagKeys: string[];
  attachToPaymentRequestKeys: string[];
};

export type ScenarioNote = {
  adminKey: string;
  content: string;
  createdAt: Date;
};

export type ScenarioFlag = {
  flag: string;
  reason?: string | null;
  adminKey: string;
  createdAt: Date;
  version?: number;
  removedAt?: Date | null;
  removedByAdminKey?: string | null;
};

export type ScenarioAuthSession = {
  appScope: string;
  sessionFamilyId: string;
  refreshTokenHash: string;
  accessTokenHash?: string | null;
  createdAt: Date;
  updatedAt?: Date;
  expiresAt: Date;
  lastUsedAt: Date;
  revokedAt?: Date | null;
  invalidatedReason?: string | null;
};

export type ScenarioAuthAudit = {
  identityType: string;
  email: string;
  event: string;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
};

export type ScenarioConsumerAction = {
  deviceId: string;
  action: string;
  resource?: string | null;
  resourceId?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
  correlationId?: string | null;
  createdAt: Date;
  updatedAt?: Date;
};

export type ScenarioConsumer = NamedAt & {
  key: string;
  email: string;
  accountType: $Enums.AccountType;
  contractorKind?: $Enums.ContractorKind | null;
  password: string;
  verified: boolean;
  legalVerified: boolean;
  verificationStatus: $Enums.VerificationStatus;
  verificationReason?: string | null;
  verificationUpdatedAt?: Date | null;
  verificationUpdatedByAdminKey?: string | null;
  howDidHearAboutUs?: $Enums.HowDidHearAboutUs | null;
  howDidHearAboutUsOther?: string | null;
  stripeCustomerId?: string | null;
  stripeIdentityStatus?: string | null;
  stripeIdentitySessionId?: string | null;
  stripeIdentityLastErrorCode?: string | null;
  stripeIdentityLastErrorReason?: string | null;
  stripeIdentityStartedAt?: Date | null;
  stripeIdentityUpdatedAt?: Date | null;
  stripeIdentityVerifiedAt?: Date | null;
  address: {
    postalCode: string;
    country: string;
    city: string;
    state?: string | null;
    street: string;
  };
  personal: {
    citizenOf: string;
    dateOfBirth: Date;
    passportOrIdNumber: string;
    countryOfTaxResidence?: string | null;
    taxId?: string | null;
    phoneNumber?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    legalStatus?: $Enums.LegalStatus | null;
  };
  organization: {
    name: string;
    size: $Enums.OrganizationSize;
    consumerRole?: $Enums.ConsumerRole | null;
    consumerRoleOther?: string | null;
  };
  googleProfile: {
    email: string;
    emailVerified: boolean;
    name: string;
    givenName?: string | null;
    familyName?: string | null;
    picture?: string | null;
    organization?: string | null;
    metadata?: Prisma.InputJsonValue;
  };
  settings: {
    theme: $Enums.Theme;
    preferredCurrency?: $Enums.CurrencyCode | null;
  };
  contacts: ScenarioContact[];
  paymentMethods: ScenarioPaymentMethod[];
  resources: ScenarioResource[];
  notes: ScenarioNote[];
  flags: ScenarioFlag[];
  authSessions: ScenarioAuthSession[];
  authAudits: ScenarioAuthAudit[];
  consumerActions: ScenarioConsumerAction[];
};

export type ScenarioPaymentRequest = NamedAt & {
  key: string;
  requesterKey?: string | null;
  requesterEmail?: string | null;
  payerKey?: string | null;
  payerEmail?: string | null;
  currencyCode: $Enums.CurrencyCode;
  status: $Enums.TransactionStatus;
  type?: $Enums.TransactionType | null;
  paymentRail?: $Enums.PaymentRail | null;
  amount: Prisma.Decimal | number | string;
  description: string;
  dueDate?: Date | null;
  sentDate?: Date | null;
  createdByKey?: string | null;
  updatedByKey?: string | null;
};

export type ScenarioLedgerOutcome = {
  status: $Enums.TransactionStatus;
  source?: string | null;
  externalId?: string | null;
  createdAt: Date;
};

export type ScenarioLedgerDispute = {
  stripeDisputeId: string;
  metadata: Prisma.InputJsonValue;
  createdAt: Date;
};

export type ScenarioLedgerEntry = NamedAt & {
  key: string;
  ledgerKey: string;
  consumerKey: string;
  paymentRequestKey?: string | null;
  type: $Enums.LedgerEntryType;
  currencyCode: $Enums.CurrencyCode;
  status: $Enums.TransactionStatus;
  amount: Prisma.Decimal | number | string;
  feesType?: $Enums.TransactionFeesType | null;
  feesAmount?: Prisma.Decimal | number | string | null;
  stripeId?: string | null;
  idempotencyKey?: string | null;
  metadata?: Prisma.InputJsonValue;
  createdByKey?: string | null;
  updatedByKey?: string | null;
  outcomes: ScenarioLedgerOutcome[];
  disputes: ScenarioLedgerDispute[];
};

export type ScenarioExchangeRate = NamedAt & {
  key: string;
  fromCurrency: $Enums.CurrencyCode;
  toCurrency: $Enums.CurrencyCode;
  rate: Prisma.Decimal | number | string;
  rateBid?: Prisma.Decimal | number | string | null;
  rateAsk?: Prisma.Decimal | number | string | null;
  spreadBps?: number | null;
  status: $Enums.ExchangeRateStatus;
  effectiveAt: Date;
  expiresAt?: Date | null;
  fetchedAt?: Date | null;
  provider?: string | null;
  providerRateId: string;
  confidence?: number | null;
  approvedByAdminKey?: string | null;
  approvedAt?: Date | null;
};

export type ScenarioWalletRule = NamedAt & {
  consumerKey: string;
  fromCurrency: $Enums.CurrencyCode;
  toCurrency: $Enums.CurrencyCode;
  targetBalance: Prisma.Decimal | number | string;
  maxConvertAmount?: Prisma.Decimal | number | string | null;
  minIntervalMinutes: number;
  nextRunAt?: Date | null;
  lastRunAt?: Date | null;
  enabled: boolean;
  metadata?: Prisma.InputJsonValue;
};

export type ScenarioScheduledConversion = NamedAt & {
  key: string;
  consumerKey: string;
  fromCurrency: $Enums.CurrencyCode;
  toCurrency: $Enums.CurrencyCode;
  amount: Prisma.Decimal | number | string;
  status: $Enums.ScheduledFxConversionStatus;
  executeAt: Date;
  processingAt?: Date | null;
  executedAt?: Date | null;
  failedAt?: Date | null;
  attempts: number;
  lastError?: string | null;
  ledgerEntryKey?: string | null;
  metadata?: Prisma.InputJsonValue;
};

export type ScenarioAdminActionAudit = {
  adminKey: string;
  action: string;
  resource: string;
  resourceKey?: string | null;
  metadata?: Prisma.InputJsonValue;
  ipAddress?: string | null;
  userAgent?: string | null;
  createdAt: Date;
};

export type ScenarioLockout = {
  identityType: string;
  email: string;
  attemptCount: number;
  firstAttemptAt?: Date | null;
  lockedUntil?: Date | null;
  updatedAt: Date;
};

export type AdminV2ScenarioPack = {
  namespace: string;
  seedVersion: string;
  documentTags: Array<{ key: string; name: string }>;
  admins: ScenarioAdmin[];
  consumers: ScenarioConsumer[];
  paymentRequests: ScenarioPaymentRequest[];
  ledgerEntries: ScenarioLedgerEntry[];
  exchangeRates: ScenarioExchangeRate[];
  walletRules: ScenarioWalletRule[];
  scheduledConversions: ScenarioScheduledConversion[];
  adminActionAudits: ScenarioAdminActionAudit[];
  lockouts: ScenarioLockout[];
};

function hoursAgo(now: Date, value: number): Date {
  return new Date(now.getTime() - value * 60 * 60 * 1000);
}

function daysAgo(now: Date, value: number): Date {
  return new Date(now.getTime() - value * 24 * 60 * 60 * 1000);
}

function daysFromNow(now: Date, value: number): Date {
  return new Date(now.getTime() + value * 24 * 60 * 60 * 1000);
}

function consumerEmail(key: string): string {
  return `${FIXTURE_NAMESPACE}+${key}@remoola.local`;
}

function adminEmail(key: string): string {
  return `${FIXTURE_NAMESPACE}.admin.${key}@remoola.local`;
}

function metadata(extra: Record<string, Prisma.InputJsonValue> = {}): Prisma.InputJsonObject {
  return {
    fixtureTag: FIXTURE_NAMESPACE,
    seedVersion: FIXTURE_SEED_VERSION,
    ...extra,
  };
}

function assertConsumerAccountShapes(consumers: ScenarioConsumer[]): void {
  for (const consumer of consumers) {
    if (consumer.accountType === $Enums.AccountType.BUSINESS) {
      if (consumer.contractorKind != null) {
        throw new Error(
          [
            `Business fixture "${consumer.key}" must not define contractorKind.`,
            `Allowed shapes: BUSINESS | CONTRACTOR INDIVIDUAL | CONTRACTOR ENTITY.`,
          ].join(` `),
        );
      }
      continue;
    }

    if (
      consumer.accountType === $Enums.AccountType.CONTRACTOR &&
      consumer.contractorKind !== $Enums.ContractorKind.INDIVIDUAL &&
      consumer.contractorKind !== $Enums.ContractorKind.ENTITY
    ) {
      throw new Error(`Contractor fixture "${consumer.key}" must define contractorKind INDIVIDUAL or ENTITY.`);
    }
  }
}

export function getAdminV2ScenarioPack(now = new Date()): AdminV2ScenarioPack {
  const documentTags = [
    { key: `kyc`, name: `${FIXTURE_NAMESPACE}-tag-kyc` },
    { key: `invoice`, name: `${FIXTURE_NAMESPACE}-tag-invoice` },
    { key: `risk`, name: `${FIXTURE_NAMESPACE}-tag-risk` },
    { key: `contract`, name: `${FIXTURE_NAMESPACE}-tag-contract` },
  ];

  const admins: ScenarioAdmin[] = [
    {
      key: `super`,
      email: adminEmail(`super`),
      password: `${FIXTURE_NAMESPACE}-super-password`,
      type: $Enums.AdminType.SUPER,
      createdAt: daysAgo(now, 120),
    },
    {
      key: `ops`,
      email: adminEmail(`ops`),
      password: `${FIXTURE_NAMESPACE}-ops-password`,
      type: $Enums.AdminType.ADMIN,
      createdAt: daysAgo(now, 90),
    },
    {
      key: `risk`,
      email: adminEmail(`risk`),
      password: `${FIXTURE_NAMESPACE}-risk-password`,
      type: $Enums.AdminType.ADMIN,
      createdAt: daysAgo(now, 90),
    },
    {
      key: `support`,
      email: adminEmail(`support`),
      password: `${FIXTURE_NAMESPACE}-support-password`,
      type: $Enums.AdminType.ADMIN,
      createdAt: daysAgo(now, 90),
    },
  ];

  const consumers: ScenarioConsumer[] = [
    {
      key: `healthy-approved-consumer`,
      email: consumerEmail(`healthy-approved-consumer`),
      accountType: $Enums.AccountType.BUSINESS,
      contractorKind: null,
      password: `${FIXTURE_NAMESPACE}-consumer-healthy`,
      verified: true,
      legalVerified: true,
      verificationStatus: $Enums.VerificationStatus.APPROVED,
      verificationReason: `Approved after standard KYC review`,
      verificationUpdatedAt: daysAgo(now, 21),
      verificationUpdatedByAdminKey: `risk`,
      howDidHearAboutUs: $Enums.HowDidHearAboutUs.GOOGLE,
      stripeCustomerId: `${FIXTURE_NAMESPACE}-cus-healthy`,
      stripeIdentityStatus: `verified`,
      stripeIdentitySessionId: `${FIXTURE_NAMESPACE}-si-healthy`,
      stripeIdentityStartedAt: daysAgo(now, 25),
      stripeIdentityUpdatedAt: daysAgo(now, 21),
      stripeIdentityVerifiedAt: daysAgo(now, 21),
      createdAt: daysAgo(now, 45),
      updatedAt: daysAgo(now, 1),
      address: {
        postalCode: `10001`,
        country: `US`,
        city: `New York`,
        state: `NY`,
        street: `18 Hudson Yards`,
      },
      personal: {
        citizenOf: `US`,
        dateOfBirth: new Date(`1990-04-18T00:00:00.000Z`),
        passportOrIdNumber: `${FIXTURE_NAMESPACE}-id-healthy`,
        countryOfTaxResidence: `US`,
        taxId: `${FIXTURE_NAMESPACE}-tax-healthy`,
        phoneNumber: `+12125550101`,
        firstName: `Olivia`,
        lastName: `Harper`,
        legalStatus: $Enums.LegalStatus.INDIVIDUAL,
      },
      organization: {
        name: `Northwind Treasury LLC`,
        size: $Enums.OrganizationSize.MEDIUM,
        consumerRole: $Enums.ConsumerRole.FINANCE,
      },
      googleProfile: {
        email: consumerEmail(`healthy-approved-consumer`),
        emailVerified: true,
        name: `Olivia Harper`,
        givenName: `Olivia`,
        familyName: `Harper`,
        picture: `https://example.com/${FIXTURE_NAMESPACE}/olivia.png`,
        organization: `Northwind Treasury LLC`,
        metadata: metadata({ scenario: `healthy-approved-consumer` }),
      },
      settings: {
        theme: $Enums.Theme.SYSTEM,
        preferredCurrency: $Enums.CurrencyCode.USD,
      },
      contacts: [
        {
          email: `${FIXTURE_NAMESPACE}.contact.healthy.controller@remoola.local`,
          name: `Controller Desk`,
          address: { country: `US`, city: `New York`, street: `18 Hudson Yards` },
          createdAt: daysAgo(now, 40),
        },
      ],
      paymentMethods: [
        {
          key: `healthy-card`,
          type: $Enums.PaymentMethodType.CREDIT_CARD,
          stripePaymentMethodId: `${FIXTURE_NAMESPACE}-pm-healthy-card`,
          stripeFingerprint: `${FIXTURE_NAMESPACE}-fp-healthy-card`,
          defaultSelected: true,
          brand: `visa`,
          last4: `4242`,
          expMonth: `10`,
          expYear: `2031`,
          serviceFee: 1,
          billingEmail: `billing.northwind@remoola.local`,
          billingName: `Northwind Billing`,
          billingPhone: `+12125550011`,
          createdAt: daysAgo(now, 36),
        },
      ],
      resources: [
        {
          key: `healthy-contract`,
          originalName: `northwind-master-service-agreement.pdf`,
          access: $Enums.ResourceAccess.PRIVATE,
          mimetype: `application/pdf`,
          size: 42812,
          bucket: `fixtures`,
          storageKey: `${FIXTURE_NAMESPACE}/resource/healthy-contract`,
          downloadUrl: `https://example.com/${FIXTURE_NAMESPACE}/resource/healthy-contract`,
          tagKeys: [`contract`],
          attachToPaymentRequestKeys: [`healthy-completed-payment`],
          createdAt: daysAgo(now, 34),
        },
      ],
      notes: [
        {
          adminKey: `support`,
          content: `[${FIXTURE_NAMESPACE}] Healthy baseline case for demos and smoke checks.`,
          createdAt: daysAgo(now, 5),
        },
      ],
      flags: [
        {
          flag: `vip`,
          reason: `Baseline high-touch account for admin-v2 walkthroughs`,
          adminKey: `ops`,
          createdAt: daysAgo(now, 30),
          removedAt: daysAgo(now, 12),
          removedByAdminKey: `support`,
        },
      ],
      authSessions: [
        {
          appScope: `${FIXTURE_NAMESPACE}-consumer-web`,
          sessionFamilyId: `00000000-0000-4000-8000-000000000101`,
          refreshTokenHash: `${FIXTURE_NAMESPACE}-refresh-hash-healthy`,
          accessTokenHash: `${FIXTURE_NAMESPACE}-access-hash-healthy`,
          createdAt: daysAgo(now, 2),
          expiresAt: daysFromNow(now, 28),
          lastUsedAt: hoursAgo(now, 6),
        },
      ],
      authAudits: [
        {
          identityType: `consumer`,
          email: consumerEmail(`healthy-approved-consumer`),
          event: `login_success`,
          ipAddress: `198.51.100.11`,
          userAgent: `Chrome / MacOS`,
          createdAt: hoursAgo(now, 6),
        },
      ],
      consumerActions: [
        {
          deviceId: `${FIXTURE_NAMESPACE}-device-healthy`,
          action: `payment_request_viewed`,
          resource: `payment_request`,
          resourceId: `healthy-completed-payment`,
          metadata: metadata({ scenario: `healthy-approved-consumer`, page: `payments` }),
          ipAddress: `198.51.100.11`,
          userAgent: `Chrome / MacOS`,
          correlationId: `${FIXTURE_NAMESPACE}-corr-healthy`,
          createdAt: hoursAgo(now, 5),
        },
      ],
    },
    {
      key: `pending-verification-consumer`,
      email: consumerEmail(`pending-verification-consumer`),
      accountType: $Enums.AccountType.CONTRACTOR,
      contractorKind: $Enums.ContractorKind.INDIVIDUAL,
      password: `${FIXTURE_NAMESPACE}-consumer-pending`,
      verified: false,
      legalVerified: false,
      verificationStatus: $Enums.VerificationStatus.PENDING,
      verificationReason: `Awaiting first risk review`,
      verificationUpdatedAt: daysAgo(now, 2),
      howDidHearAboutUs: $Enums.HowDidHearAboutUs.LINKED_IN,
      stripeCustomerId: `${FIXTURE_NAMESPACE}-cus-pending`,
      stripeIdentityStatus: `pending_submission`,
      stripeIdentitySessionId: `${FIXTURE_NAMESPACE}-si-pending`,
      stripeIdentityStartedAt: daysAgo(now, 3),
      stripeIdentityUpdatedAt: hoursAgo(now, 10),
      createdAt: daysAgo(now, 3),
      updatedAt: hoursAgo(now, 10),
      address: {
        postalCode: `M5H2N2`,
        country: `CA`,
        city: `Toronto`,
        state: `ON`,
        street: `99 Richmond St W`,
      },
      personal: {
        citizenOf: `CA`,
        dateOfBirth: new Date(`1994-02-11T00:00:00.000Z`),
        passportOrIdNumber: `${FIXTURE_NAMESPACE}-id-pending`,
        countryOfTaxResidence: `CA`,
        taxId: `${FIXTURE_NAMESPACE}-tax-pending`,
        phoneNumber: `+14165550102`,
        firstName: `Noah`,
        lastName: `Singh`,
        legalStatus: $Enums.LegalStatus.INDIVIDUAL,
      },
      organization: {
        name: `Noah Singh Consulting`,
        size: $Enums.OrganizationSize.SMALL,
        consumerRole: $Enums.ConsumerRole.OPERATIONS,
      },
      googleProfile: {
        email: consumerEmail(`pending-verification-consumer`),
        emailVerified: true,
        name: `Noah Singh`,
        givenName: `Noah`,
        familyName: `Singh`,
        organization: `Noah Singh Consulting`,
        metadata: metadata({ scenario: `pending-verification-consumer` }),
      },
      settings: {
        theme: $Enums.Theme.DARK,
        preferredCurrency: $Enums.CurrencyCode.CAD,
      },
      contacts: [],
      paymentMethods: [],
      resources: [
        {
          key: `pending-passport`,
          originalName: `pending-passport-upload.pdf`,
          access: $Enums.ResourceAccess.PRIVATE,
          mimetype: `application/pdf`,
          size: 18002,
          bucket: `fixtures`,
          storageKey: `${FIXTURE_NAMESPACE}/resource/pending-passport`,
          downloadUrl: `https://example.com/${FIXTURE_NAMESPACE}/resource/pending-passport`,
          tagKeys: [`kyc`],
          attachToPaymentRequestKeys: [],
          createdAt: daysAgo(now, 2),
        },
      ],
      notes: [
        {
          adminKey: `risk`,
          content: `[${FIXTURE_NAMESPACE}] Queue candidate: pending verification older than 24h.`,
          createdAt: daysAgo(now, 1),
        },
      ],
      flags: [],
      authSessions: [],
      authAudits: [
        {
          identityType: `consumer`,
          email: consumerEmail(`pending-verification-consumer`),
          event: `signup_completed`,
          ipAddress: `203.0.113.15`,
          userAgent: `Safari / iPhone`,
          createdAt: daysAgo(now, 3),
        },
      ],
      consumerActions: [
        {
          deviceId: `${FIXTURE_NAMESPACE}-device-pending`,
          action: `verification_submitted`,
          resource: `consumer`,
          metadata: metadata({ scenario: `pending-verification-consumer` }),
          ipAddress: `203.0.113.15`,
          userAgent: `Safari / iPhone`,
          correlationId: `${FIXTURE_NAMESPACE}-corr-pending`,
          createdAt: daysAgo(now, 2),
        },
      ],
    },
    {
      key: `more-info-consumer`,
      email: consumerEmail(`more-info-consumer`),
      accountType: $Enums.AccountType.BUSINESS,
      contractorKind: null,
      password: `${FIXTURE_NAMESPACE}-consumer-more-info`,
      verified: false,
      legalVerified: false,
      verificationStatus: $Enums.VerificationStatus.MORE_INFO,
      verificationReason: `Please upload a clearer ownership document`,
      verificationUpdatedAt: daysAgo(now, 4),
      verificationUpdatedByAdminKey: `risk`,
      howDidHearAboutUs: $Enums.HowDidHearAboutUs.REFERRED_RECOMMENDED,
      stripeCustomerId: `${FIXTURE_NAMESPACE}-cus-more-info`,
      stripeIdentityStatus: `requires_input`,
      stripeIdentitySessionId: `${FIXTURE_NAMESPACE}-si-more-info`,
      stripeIdentityLastErrorCode: `document_unreadable`,
      stripeIdentityLastErrorReason: `Uploaded company proof is blurry`,
      stripeIdentityStartedAt: daysAgo(now, 7),
      stripeIdentityUpdatedAt: daysAgo(now, 4),
      createdAt: daysAgo(now, 12),
      updatedAt: daysAgo(now, 4),
      address: {
        postalCode: `75008`,
        country: `FR`,
        city: `Paris`,
        street: `40 Rue du Colisee`,
      },
      personal: {
        citizenOf: `FR`,
        dateOfBirth: new Date(`1988-09-12T00:00:00.000Z`),
        passportOrIdNumber: `${FIXTURE_NAMESPACE}-id-more-info`,
        countryOfTaxResidence: `FR`,
        taxId: `${FIXTURE_NAMESPACE}-tax-more-info`,
        phoneNumber: `+3315550103`,
        firstName: `Camille`,
        lastName: `Bernard`,
        legalStatus: $Enums.LegalStatus.INDIVIDUAL,
      },
      organization: {
        name: `Bernard Advisory SAS`,
        size: $Enums.OrganizationSize.SMALL,
        consumerRole: $Enums.ConsumerRole.LEGAL,
      },
      googleProfile: {
        email: consumerEmail(`more-info-consumer`),
        emailVerified: true,
        name: `Camille Bernard`,
        givenName: `Camille`,
        familyName: `Bernard`,
        organization: `Bernard Advisory SAS`,
        metadata: metadata({ scenario: `more-info-consumer` }),
      },
      settings: {
        theme: $Enums.Theme.LIGHT,
        preferredCurrency: $Enums.CurrencyCode.EUR,
      },
      contacts: [
        {
          email: `${FIXTURE_NAMESPACE}.contact.more-info.legal@remoola.local`,
          name: `Legal Inbox`,
          address: { country: `FR`, city: `Paris`, street: `40 Rue du Colisee` },
          createdAt: daysAgo(now, 10),
        },
      ],
      paymentMethods: [],
      resources: [
        {
          key: `more-info-ownership-proof`,
          originalName: `ownership-proof-low-quality.pdf`,
          access: $Enums.ResourceAccess.PRIVATE,
          mimetype: `application/pdf`,
          size: 13200,
          bucket: `fixtures`,
          storageKey: `${FIXTURE_NAMESPACE}/resource/more-info-ownership-proof`,
          downloadUrl: `https://example.com/${FIXTURE_NAMESPACE}/resource/more-info-ownership-proof`,
          tagKeys: [`kyc`, `risk`],
          attachToPaymentRequestKeys: [],
          createdAt: daysAgo(now, 7),
        },
      ],
      notes: [
        {
          adminKey: `risk`,
          content: `[${FIXTURE_NAMESPACE}] Waiting for clearer ownership proof and beneficial owner list.`,
          createdAt: daysAgo(now, 4),
        },
      ],
      flags: [
        {
          flag: `missing_documents`,
          reason: `Ownership structure needs resubmission`,
          adminKey: `risk`,
          createdAt: daysAgo(now, 4),
        },
      ],
      authSessions: [],
      authAudits: [
        {
          identityType: `consumer`,
          email: consumerEmail(`more-info-consumer`),
          event: `verification_requires_input`,
          ipAddress: `203.0.113.18`,
          userAgent: `Firefox / Linux`,
          createdAt: daysAgo(now, 4),
        },
      ],
      consumerActions: [
        {
          deviceId: `${FIXTURE_NAMESPACE}-device-more-info`,
          action: `document_uploaded`,
          resource: `resource`,
          resourceId: `more-info-ownership-proof`,
          metadata: metadata({ scenario: `more-info-consumer` }),
          ipAddress: `203.0.113.18`,
          userAgent: `Firefox / Linux`,
          correlationId: `${FIXTURE_NAMESPACE}-corr-more-info`,
          createdAt: daysAgo(now, 7),
        },
      ],
    },
    {
      key: `flagged-risk-consumer`,
      email: consumerEmail(`flagged-risk-consumer`),
      accountType: $Enums.AccountType.CONTRACTOR,
      contractorKind: $Enums.ContractorKind.INDIVIDUAL,
      password: `${FIXTURE_NAMESPACE}-consumer-flagged`,
      verified: false,
      legalVerified: false,
      verificationStatus: $Enums.VerificationStatus.FLAGGED,
      verificationReason: `Manual risk review due to device and payment method overlap`,
      verificationUpdatedAt: hoursAgo(now, 18),
      verificationUpdatedByAdminKey: `risk`,
      howDidHearAboutUs: $Enums.HowDidHearAboutUs.TWITTER,
      stripeCustomerId: `${FIXTURE_NAMESPACE}-cus-flagged`,
      stripeIdentityStatus: `pending_submission`,
      stripeIdentitySessionId: `${FIXTURE_NAMESPACE}-si-flagged`,
      stripeIdentityLastErrorCode: `watchlist_match`,
      stripeIdentityLastErrorReason: `Name similarity triggered manual review`,
      stripeIdentityStartedAt: daysAgo(now, 2),
      stripeIdentityUpdatedAt: hoursAgo(now, 18),
      createdAt: daysAgo(now, 16),
      updatedAt: hoursAgo(now, 18),
      address: {
        postalCode: `10115`,
        country: `DE`,
        city: `Berlin`,
        street: `12 Chausseestrasse`,
      },
      personal: {
        citizenOf: `DE`,
        dateOfBirth: new Date(`1992-07-01T00:00:00.000Z`),
        passportOrIdNumber: `${FIXTURE_NAMESPACE}-id-flagged`,
        countryOfTaxResidence: `DE`,
        taxId: `${FIXTURE_NAMESPACE}-tax-flagged`,
        phoneNumber: `+49305550104`,
        firstName: `Lena`,
        lastName: `Krauss`,
        legalStatus: $Enums.LegalStatus.SOLE_TRADER,
      },
      organization: {
        name: `Lena Krauss Studio`,
        size: $Enums.OrganizationSize.SMALL,
        consumerRole: $Enums.ConsumerRole.MARKETING,
      },
      googleProfile: {
        email: consumerEmail(`flagged-risk-consumer`),
        emailVerified: true,
        name: `Lena Krauss`,
        givenName: `Lena`,
        familyName: `Krauss`,
        organization: `Lena Krauss Studio`,
        metadata: metadata({ scenario: `flagged-risk-consumer` }),
      },
      settings: {
        theme: $Enums.Theme.DARK,
        preferredCurrency: $Enums.CurrencyCode.EUR,
      },
      contacts: [],
      paymentMethods: [
        {
          key: `flagged-bank`,
          type: $Enums.PaymentMethodType.BANK_ACCOUNT,
          stripePaymentMethodId: `${FIXTURE_NAMESPACE}-pm-flagged-bank`,
          stripeFingerprint: `${FIXTURE_NAMESPACE}-fp-shared-risk`,
          defaultSelected: true,
          bankName: `Risk Signal Bank`,
          bankLast4: `7704`,
          bankCountry: `DE`,
          bankCurrency: $Enums.CurrencyCode.EUR,
          serviceFee: 2,
          billingEmail: `flagged.billing@remoola.local`,
          billingName: `Lena Krauss Studio`,
          billingPhone: `+49305550114`,
          createdAt: daysAgo(now, 5),
        },
      ],
      resources: [
        {
          key: `flagged-risk-note`,
          originalName: `risk-screening-notes.pdf`,
          access: $Enums.ResourceAccess.PRIVATE,
          mimetype: `application/pdf`,
          size: 14500,
          bucket: `fixtures`,
          storageKey: `${FIXTURE_NAMESPACE}/resource/flagged-risk-note`,
          downloadUrl: `https://example.com/${FIXTURE_NAMESPACE}/resource/flagged-risk-note`,
          tagKeys: [`risk`],
          attachToPaymentRequestKeys: [`flagged-risk-denied-payment`],
          createdAt: daysAgo(now, 1),
        },
      ],
      notes: [
        {
          adminKey: `risk`,
          content: `[${FIXTURE_NAMESPACE}] Shares destination fingerprint with suspicious-auth consumer.`,
          createdAt: hoursAgo(now, 16),
        },
      ],
      flags: [
        {
          flag: `duplicate_fingerprint`,
          reason: `Shared destination fingerprint across unrelated accounts`,
          adminKey: `risk`,
          createdAt: hoursAgo(now, 16),
        },
      ],
      authSessions: [],
      authAudits: [
        {
          identityType: `consumer`,
          email: consumerEmail(`flagged-risk-consumer`),
          event: `verification_flagged`,
          ipAddress: `198.51.100.44`,
          userAgent: `Chrome / Windows`,
          createdAt: hoursAgo(now, 18),
        },
      ],
      consumerActions: [
        {
          deviceId: `${FIXTURE_NAMESPACE}-device-flagged`,
          action: `payment_method_added`,
          resource: `payment_method`,
          resourceId: `flagged-bank`,
          metadata: metadata({ scenario: `flagged-risk-consumer` }),
          ipAddress: `198.51.100.44`,
          userAgent: `Chrome / Windows`,
          correlationId: `${FIXTURE_NAMESPACE}-corr-flagged`,
          createdAt: daysAgo(now, 5),
        },
      ],
    },
    {
      key: `rejected-consumer`,
      email: consumerEmail(`rejected-consumer`),
      accountType: $Enums.AccountType.BUSINESS,
      contractorKind: null,
      password: `${FIXTURE_NAMESPACE}-consumer-rejected`,
      verified: false,
      legalVerified: false,
      verificationStatus: $Enums.VerificationStatus.REJECTED,
      verificationReason: `Jurisdiction mismatch and unsupported ownership structure`,
      verificationUpdatedAt: daysAgo(now, 6),
      verificationUpdatedByAdminKey: `risk`,
      howDidHearAboutUs: $Enums.HowDidHearAboutUs.FACEBOOK,
      stripeCustomerId: `${FIXTURE_NAMESPACE}-cus-rejected`,
      stripeIdentityStatus: `canceled`,
      stripeIdentitySessionId: `${FIXTURE_NAMESPACE}-si-rejected`,
      stripeIdentityLastErrorCode: `jurisdiction_unsupported`,
      stripeIdentityLastErrorReason: `Submitted documents fail policy`,
      stripeIdentityStartedAt: daysAgo(now, 8),
      stripeIdentityUpdatedAt: daysAgo(now, 6),
      createdAt: daysAgo(now, 15),
      updatedAt: daysAgo(now, 6),
      address: {
        postalCode: `SW1A1AA`,
        country: `GB`,
        city: `London`,
        street: `14 Buckingham Gate`,
      },
      personal: {
        citizenOf: `GB`,
        dateOfBirth: new Date(`1985-01-21T00:00:00.000Z`),
        passportOrIdNumber: `${FIXTURE_NAMESPACE}-id-rejected`,
        countryOfTaxResidence: `GB`,
        taxId: `${FIXTURE_NAMESPACE}-tax-rejected`,
        phoneNumber: `+44205550105`,
        firstName: `Arthur`,
        lastName: `Cole`,
        legalStatus: $Enums.LegalStatus.INDIVIDUAL,
      },
      organization: {
        name: `Cole Global Services Ltd`,
        size: $Enums.OrganizationSize.SMALL,
        consumerRole: $Enums.ConsumerRole.SALES,
      },
      googleProfile: {
        email: consumerEmail(`rejected-consumer`),
        emailVerified: true,
        name: `Arthur Cole`,
        givenName: `Arthur`,
        familyName: `Cole`,
        organization: `Cole Global Services Ltd`,
        metadata: metadata({ scenario: `rejected-consumer` }),
      },
      settings: {
        theme: $Enums.Theme.SYSTEM,
        preferredCurrency: $Enums.CurrencyCode.GBP,
      },
      contacts: [],
      paymentMethods: [],
      resources: [],
      notes: [
        {
          adminKey: `risk`,
          content: `[${FIXTURE_NAMESPACE}] Rejected verification sample for decision history views.`,
          createdAt: daysAgo(now, 6),
        },
      ],
      flags: [],
      authSessions: [],
      authAudits: [],
      consumerActions: [],
    },
    {
      key: `overdue-payment-consumer`,
      email: consumerEmail(`overdue-payment-consumer`),
      accountType: $Enums.AccountType.BUSINESS,
      contractorKind: null,
      password: `${FIXTURE_NAMESPACE}-consumer-overdue`,
      verified: true,
      legalVerified: true,
      verificationStatus: $Enums.VerificationStatus.APPROVED,
      verificationUpdatedAt: daysAgo(now, 30),
      verificationUpdatedByAdminKey: `risk`,
      stripeCustomerId: `${FIXTURE_NAMESPACE}-cus-overdue`,
      stripeIdentityStatus: `verified`,
      stripeIdentitySessionId: `${FIXTURE_NAMESPACE}-si-overdue`,
      stripeIdentityVerifiedAt: daysAgo(now, 30),
      createdAt: daysAgo(now, 70),
      updatedAt: daysAgo(now, 1),
      address: {
        postalCode: `94107`,
        country: `US`,
        city: `San Francisco`,
        state: `CA`,
        street: `300 Mission St`,
      },
      personal: {
        citizenOf: `US`,
        dateOfBirth: new Date(`1987-10-30T00:00:00.000Z`),
        passportOrIdNumber: `${FIXTURE_NAMESPACE}-id-overdue`,
        countryOfTaxResidence: `US`,
        taxId: `${FIXTURE_NAMESPACE}-tax-overdue`,
        phoneNumber: `+14155550106`,
        firstName: `Mia`,
        lastName: `Torres`,
        legalStatus: $Enums.LegalStatus.INDIVIDUAL,
      },
      organization: {
        name: `Signal Ops Inc`,
        size: $Enums.OrganizationSize.MEDIUM,
        consumerRole: $Enums.ConsumerRole.OPERATIONS,
      },
      googleProfile: {
        email: consumerEmail(`overdue-payment-consumer`),
        emailVerified: true,
        name: `Mia Torres`,
        givenName: `Mia`,
        familyName: `Torres`,
        organization: `Signal Ops Inc`,
        metadata: metadata({ scenario: `overdue-payment-consumer` }),
      },
      settings: {
        theme: $Enums.Theme.LIGHT,
        preferredCurrency: $Enums.CurrencyCode.USD,
      },
      contacts: [
        {
          email: `${FIXTURE_NAMESPACE}.contact.overdue.ap@remoola.local`,
          name: `Accounts Payable`,
          address: { country: `US`, city: `San Francisco`, street: `300 Mission St` },
          createdAt: daysAgo(now, 68),
        },
      ],
      paymentMethods: [
        {
          key: `overdue-bank`,
          type: $Enums.PaymentMethodType.BANK_ACCOUNT,
          stripePaymentMethodId: `${FIXTURE_NAMESPACE}-pm-overdue-bank`,
          stripeFingerprint: `${FIXTURE_NAMESPACE}-fp-overdue-bank`,
          defaultSelected: true,
          bankName: `Pacific Bank`,
          bankLast4: `8106`,
          bankCountry: `US`,
          bankCurrency: $Enums.CurrencyCode.USD,
          serviceFee: 1,
          billingEmail: `ap.signalops@remoola.local`,
          billingName: `Signal Ops Accounts Payable`,
          billingPhone: `+14155550999`,
          createdAt: daysAgo(now, 60),
        },
      ],
      resources: [
        {
          key: `overdue-invoice`,
          originalName: `overdue-invoice-supporting-doc.pdf`,
          access: $Enums.ResourceAccess.PRIVATE,
          mimetype: `application/pdf`,
          size: 25773,
          bucket: `fixtures`,
          storageKey: `${FIXTURE_NAMESPACE}/resource/overdue-invoice`,
          downloadUrl: `https://example.com/${FIXTURE_NAMESPACE}/resource/overdue-invoice`,
          tagKeys: [`invoice`],
          attachToPaymentRequestKeys: [`overdue-payment-request`],
          createdAt: daysAgo(now, 9),
        },
      ],
      notes: [
        {
          adminKey: `ops`,
          content: [
            `[${FIXTURE_NAMESPACE}] Overdue payment request should appear`,
            `in overview count-only or payments queue.`,
          ].join(` `),
          createdAt: daysAgo(now, 2),
        },
      ],
      flags: [
        {
          flag: `collections_watch`,
          reason: `Past due invoice older than 48h`,
          adminKey: `ops`,
          createdAt: daysAgo(now, 2),
        },
      ],
      authSessions: [
        {
          appScope: `${FIXTURE_NAMESPACE}-consumer-web`,
          sessionFamilyId: `00000000-0000-4000-8000-000000000102`,
          refreshTokenHash: `${FIXTURE_NAMESPACE}-refresh-hash-overdue`,
          accessTokenHash: `${FIXTURE_NAMESPACE}-access-hash-overdue`,
          createdAt: daysAgo(now, 8),
          expiresAt: daysFromNow(now, 20),
          lastUsedAt: daysAgo(now, 3),
        },
      ],
      authAudits: [
        {
          identityType: `consumer`,
          email: consumerEmail(`overdue-payment-consumer`),
          event: `login_success`,
          ipAddress: `198.51.100.77`,
          userAgent: `Chrome / Windows`,
          createdAt: daysAgo(now, 3),
        },
      ],
      consumerActions: [
        {
          deviceId: `${FIXTURE_NAMESPACE}-device-overdue`,
          action: `invoice_sent`,
          resource: `payment_request`,
          resourceId: `overdue-payment-request`,
          metadata: metadata({ scenario: `overdue-payment-consumer` }),
          ipAddress: `198.51.100.77`,
          userAgent: `Chrome / Windows`,
          correlationId: `${FIXTURE_NAMESPACE}-corr-overdue`,
          createdAt: daysAgo(now, 9),
        },
      ],
    },
    {
      key: `uncollectible-payment-consumer`,
      email: consumerEmail(`uncollectible-payment-consumer`),
      accountType: $Enums.AccountType.CONTRACTOR,
      contractorKind: $Enums.ContractorKind.INDIVIDUAL,
      password: `${FIXTURE_NAMESPACE}-consumer-uncollectible`,
      verified: true,
      legalVerified: true,
      verificationStatus: $Enums.VerificationStatus.APPROVED,
      verificationUpdatedAt: daysAgo(now, 18),
      verificationUpdatedByAdminKey: `risk`,
      stripeCustomerId: `${FIXTURE_NAMESPACE}-cus-uncollectible`,
      stripeIdentityStatus: `verified`,
      stripeIdentityVerifiedAt: daysAgo(now, 18),
      createdAt: daysAgo(now, 60),
      updatedAt: daysAgo(now, 2),
      address: {
        postalCode: `28013`,
        country: `ES`,
        city: `Madrid`,
        street: `7 Calle Alcala`,
      },
      personal: {
        citizenOf: `ES`,
        dateOfBirth: new Date(`1991-03-19T00:00:00.000Z`),
        passportOrIdNumber: `${FIXTURE_NAMESPACE}-id-uncollectible`,
        countryOfTaxResidence: `ES`,
        taxId: `${FIXTURE_NAMESPACE}-tax-uncollectible`,
        phoneNumber: `+34915550107`,
        firstName: `Sofia`,
        lastName: `Ramos`,
        legalStatus: $Enums.LegalStatus.INDIVIDUAL,
      },
      organization: {
        name: `Sofia Ramos Creative`,
        size: $Enums.OrganizationSize.SMALL,
        consumerRole: $Enums.ConsumerRole.MARKETING,
      },
      googleProfile: {
        email: consumerEmail(`uncollectible-payment-consumer`),
        emailVerified: true,
        name: `Sofia Ramos`,
        givenName: `Sofia`,
        familyName: `Ramos`,
        organization: `Sofia Ramos Creative`,
        metadata: metadata({ scenario: `uncollectible-payment-consumer` }),
      },
      settings: {
        theme: $Enums.Theme.DARK,
        preferredCurrency: $Enums.CurrencyCode.EUR,
      },
      contacts: [],
      paymentMethods: [],
      resources: [],
      notes: [
        {
          adminKey: `ops`,
          content: `[${FIXTURE_NAMESPACE}] External payer stopped responding; request moved to UNCOLLECTIBLE.`,
          createdAt: daysAgo(now, 1),
        },
      ],
      flags: [
        {
          flag: `writeoff_candidate`,
          reason: `Repeated follow-up attempts failed`,
          adminKey: `ops`,
          createdAt: daysAgo(now, 1),
        },
      ],
      authSessions: [],
      authAudits: [],
      consumerActions: [],
    },
    {
      key: `payout-failure-consumer`,
      email: consumerEmail(`payout-failure-consumer`),
      accountType: $Enums.AccountType.BUSINESS,
      contractorKind: null,
      password: `${FIXTURE_NAMESPACE}-consumer-payout`,
      verified: true,
      legalVerified: true,
      verificationStatus: $Enums.VerificationStatus.APPROVED,
      verificationUpdatedAt: daysAgo(now, 40),
      verificationUpdatedByAdminKey: `risk`,
      stripeCustomerId: `${FIXTURE_NAMESPACE}-cus-payout`,
      stripeIdentityStatus: `verified`,
      stripeIdentityVerifiedAt: daysAgo(now, 40),
      createdAt: daysAgo(now, 80),
      updatedAt: hoursAgo(now, 4),
      address: {
        postalCode: `10178`,
        country: `DE`,
        city: `Berlin`,
        street: `1 Alexanderplatz`,
      },
      personal: {
        citizenOf: `DE`,
        dateOfBirth: new Date(`1984-08-05T00:00:00.000Z`),
        passportOrIdNumber: `${FIXTURE_NAMESPACE}-id-payout`,
        countryOfTaxResidence: `DE`,
        taxId: `${FIXTURE_NAMESPACE}-tax-payout`,
        phoneNumber: `+49305550108`,
        firstName: `Jonas`,
        lastName: `Weber`,
        legalStatus: $Enums.LegalStatus.INDIVIDUAL,
      },
      organization: {
        name: `Weber Industrial GmbH`,
        size: $Enums.OrganizationSize.LARGE,
        consumerRole: $Enums.ConsumerRole.FINANCE,
      },
      googleProfile: {
        email: consumerEmail(`payout-failure-consumer`),
        emailVerified: true,
        name: `Jonas Weber`,
        givenName: `Jonas`,
        familyName: `Weber`,
        organization: `Weber Industrial GmbH`,
        metadata: metadata({ scenario: `payout-failure-consumer` }),
      },
      settings: {
        theme: $Enums.Theme.SYSTEM,
        preferredCurrency: $Enums.CurrencyCode.EUR,
      },
      contacts: [
        {
          email: `${FIXTURE_NAMESPACE}.contact.payout.treasury@remoola.local`,
          name: `Treasury Team`,
          address: { country: `DE`, city: `Berlin`, street: `1 Alexanderplatz` },
          createdAt: daysAgo(now, 75),
        },
      ],
      paymentMethods: [
        {
          key: `payout-bank`,
          type: $Enums.PaymentMethodType.BANK_ACCOUNT,
          stripePaymentMethodId: `${FIXTURE_NAMESPACE}-pm-payout-bank`,
          stripeFingerprint: `${FIXTURE_NAMESPACE}-fp-payout-bank`,
          defaultSelected: true,
          bankName: `Berlin Treasury Bank`,
          bankLast4: `9008`,
          bankCountry: `DE`,
          bankCurrency: $Enums.CurrencyCode.EUR,
          serviceFee: 3,
          billingEmail: `treasury.weber@remoola.local`,
          billingName: `Weber Industrial Treasury`,
          billingPhone: `+49305550908`,
          createdAt: daysAgo(now, 72),
        },
      ],
      resources: [],
      notes: [
        {
          adminKey: `ops`,
          content: `[${FIXTURE_NAMESPACE}] Failed payout fixture with explicit escalation trail.`,
          createdAt: hoursAgo(now, 5),
        },
      ],
      flags: [
        {
          flag: `payout_review`,
          reason: `Recent payout denial needs finance review`,
          adminKey: `ops`,
          createdAt: hoursAgo(now, 5),
        },
      ],
      authSessions: [
        {
          appScope: `${FIXTURE_NAMESPACE}-consumer-web`,
          sessionFamilyId: `00000000-0000-4000-8000-000000000103`,
          refreshTokenHash: `${FIXTURE_NAMESPACE}-refresh-hash-payout`,
          accessTokenHash: `${FIXTURE_NAMESPACE}-access-hash-payout`,
          createdAt: daysAgo(now, 4),
          expiresAt: daysFromNow(now, 25),
          lastUsedAt: hoursAgo(now, 9),
        },
      ],
      authAudits: [],
      consumerActions: [],
    },
    {
      key: `fx-failed-consumer`,
      email: consumerEmail(`fx-failed-consumer`),
      accountType: $Enums.AccountType.BUSINESS,
      contractorKind: null,
      password: `${FIXTURE_NAMESPACE}-consumer-fx`,
      verified: true,
      legalVerified: true,
      verificationStatus: $Enums.VerificationStatus.APPROVED,
      verificationUpdatedAt: daysAgo(now, 35),
      verificationUpdatedByAdminKey: `risk`,
      stripeCustomerId: `${FIXTURE_NAMESPACE}-cus-fx`,
      stripeIdentityStatus: `verified`,
      stripeIdentityVerifiedAt: daysAgo(now, 35),
      createdAt: daysAgo(now, 55),
      updatedAt: hoursAgo(now, 3),
      address: {
        postalCode: `100-0005`,
        country: `JP`,
        city: `Tokyo`,
        street: `1 Marunouchi`,
      },
      personal: {
        citizenOf: `JP`,
        dateOfBirth: new Date(`1989-06-17T00:00:00.000Z`),
        passportOrIdNumber: `${FIXTURE_NAMESPACE}-id-fx`,
        countryOfTaxResidence: `JP`,
        taxId: `${FIXTURE_NAMESPACE}-tax-fx`,
        phoneNumber: `+8135550109`,
        firstName: `Aiko`,
        lastName: `Tanaka`,
        legalStatus: $Enums.LegalStatus.INDIVIDUAL,
      },
      organization: {
        name: `Tanaka Global KK`,
        size: $Enums.OrganizationSize.MEDIUM,
        consumerRole: $Enums.ConsumerRole.FINANCE,
      },
      googleProfile: {
        email: consumerEmail(`fx-failed-consumer`),
        emailVerified: true,
        name: `Aiko Tanaka`,
        givenName: `Aiko`,
        familyName: `Tanaka`,
        organization: `Tanaka Global KK`,
        metadata: metadata({ scenario: `fx-failed-consumer` }),
      },
      settings: {
        theme: $Enums.Theme.DARK,
        preferredCurrency: $Enums.CurrencyCode.JPY,
      },
      contacts: [],
      paymentMethods: [],
      resources: [],
      notes: [
        {
          adminKey: `ops`,
          content: `[${FIXTURE_NAMESPACE}] Failed scheduled FX conversion with retry context.`,
          createdAt: hoursAgo(now, 6),
        },
      ],
      flags: [],
      authSessions: [],
      authAudits: [],
      consumerActions: [],
    },
    {
      key: `document-gap-consumer`,
      email: consumerEmail(`document-gap-consumer`),
      accountType: $Enums.AccountType.BUSINESS,
      contractorKind: null,
      password: `${FIXTURE_NAMESPACE}-consumer-docs`,
      verified: true,
      legalVerified: true,
      verificationStatus: $Enums.VerificationStatus.APPROVED,
      verificationUpdatedAt: daysAgo(now, 28),
      verificationUpdatedByAdminKey: `risk`,
      stripeCustomerId: `${FIXTURE_NAMESPACE}-cus-docs`,
      stripeIdentityStatus: `verified`,
      stripeIdentityVerifiedAt: daysAgo(now, 28),
      createdAt: daysAgo(now, 42),
      updatedAt: daysAgo(now, 1),
      address: {
        postalCode: `00184`,
        country: `IT`,
        city: `Rome`,
        street: `55 Via Nazionale`,
      },
      personal: {
        citizenOf: `IT`,
        dateOfBirth: new Date(`1993-05-09T00:00:00.000Z`),
        passportOrIdNumber: `${FIXTURE_NAMESPACE}-id-docs`,
        countryOfTaxResidence: `IT`,
        taxId: `${FIXTURE_NAMESPACE}-tax-docs`,
        phoneNumber: `+39065550110`,
        firstName: `Giulia`,
        lastName: `Ricci`,
        legalStatus: $Enums.LegalStatus.INDIVIDUAL,
      },
      organization: {
        name: `Ricci Design SRL`,
        size: $Enums.OrganizationSize.SMALL,
        consumerRole: $Enums.ConsumerRole.PRODUCT,
      },
      googleProfile: {
        email: consumerEmail(`document-gap-consumer`),
        emailVerified: true,
        name: `Giulia Ricci`,
        givenName: `Giulia`,
        familyName: `Ricci`,
        organization: `Ricci Design SRL`,
        metadata: metadata({ scenario: `document-gap-consumer` }),
      },
      settings: {
        theme: $Enums.Theme.LIGHT,
        preferredCurrency: $Enums.CurrencyCode.EUR,
      },
      contacts: [],
      paymentMethods: [
        {
          key: `document-gap-card`,
          type: $Enums.PaymentMethodType.CREDIT_CARD,
          stripePaymentMethodId: `${FIXTURE_NAMESPACE}-pm-docs-card`,
          stripeFingerprint: `${FIXTURE_NAMESPACE}-fp-docs-card`,
          defaultSelected: true,
          brand: `mastercard`,
          last4: `0110`,
          expMonth: `04`,
          expYear: `2030`,
          serviceFee: 1,
          billingEmail: `billing.ricci@remoola.local`,
          billingName: `Ricci Design Billing`,
          billingPhone: `+39065550910`,
          createdAt: daysAgo(now, 30),
        },
      ],
      resources: [
        {
          key: `document-gap-untagged`,
          originalName: `untagged-supporting-document.pdf`,
          access: $Enums.ResourceAccess.PRIVATE,
          mimetype: `application/pdf`,
          size: 9021,
          bucket: `fixtures`,
          storageKey: `${FIXTURE_NAMESPACE}/resource/document-gap-untagged`,
          downloadUrl: `https://example.com/${FIXTURE_NAMESPACE}/resource/document-gap-untagged`,
          tagKeys: [],
          attachToPaymentRequestKeys: [],
          createdAt: daysAgo(now, 8),
        },
      ],
      notes: [
        {
          adminKey: `support`,
          content: `[${FIXTURE_NAMESPACE}] Document explorer should show untagged evidence here.`,
          createdAt: daysAgo(now, 1),
        },
      ],
      flags: [
        {
          flag: `document_gap`,
          reason: `Supporting evidence exists but lacks tags and attachment linkage`,
          adminKey: `support`,
          createdAt: daysAgo(now, 1),
        },
      ],
      authSessions: [],
      authAudits: [],
      consumerActions: [],
    },
    {
      key: `suspicious-auth-consumer`,
      email: consumerEmail(`suspicious-auth-consumer`),
      accountType: $Enums.AccountType.CONTRACTOR,
      contractorKind: $Enums.ContractorKind.INDIVIDUAL,
      password: `${FIXTURE_NAMESPACE}-consumer-suspicious`,
      verified: true,
      legalVerified: true,
      verificationStatus: $Enums.VerificationStatus.APPROVED,
      verificationUpdatedAt: daysAgo(now, 22),
      verificationUpdatedByAdminKey: `risk`,
      stripeCustomerId: `${FIXTURE_NAMESPACE}-cus-suspicious`,
      stripeIdentityStatus: `verified`,
      stripeIdentityVerifiedAt: daysAgo(now, 22),
      createdAt: daysAgo(now, 32),
      updatedAt: hoursAgo(now, 2),
      address: {
        postalCode: `110001`,
        country: `IN`,
        city: `New Delhi`,
        street: `8 Connaught Place`,
      },
      personal: {
        citizenOf: `IN`,
        dateOfBirth: new Date(`1996-12-04T00:00:00.000Z`),
        passportOrIdNumber: `${FIXTURE_NAMESPACE}-id-suspicious`,
        countryOfTaxResidence: `IN`,
        taxId: `${FIXTURE_NAMESPACE}-tax-suspicious`,
        phoneNumber: `+91115550111`,
        firstName: `Arjun`,
        lastName: `Mehta`,
        legalStatus: $Enums.LegalStatus.INDIVIDUAL_ENTREPRENEUR,
      },
      organization: {
        name: `Arjun Mehta Studio`,
        size: $Enums.OrganizationSize.SMALL,
        consumerRole: $Enums.ConsumerRole.ENGINEERING,
      },
      googleProfile: {
        email: consumerEmail(`suspicious-auth-consumer`),
        emailVerified: true,
        name: `Arjun Mehta`,
        givenName: `Arjun`,
        familyName: `Mehta`,
        organization: `Arjun Mehta Studio`,
        metadata: metadata({ scenario: `suspicious-auth-consumer` }),
      },
      settings: {
        theme: $Enums.Theme.SYSTEM,
        preferredCurrency: $Enums.CurrencyCode.USD,
      },
      contacts: [],
      paymentMethods: [
        {
          key: `suspicious-bank`,
          type: $Enums.PaymentMethodType.BANK_ACCOUNT,
          stripePaymentMethodId: `${FIXTURE_NAMESPACE}-pm-suspicious-bank`,
          stripeFingerprint: `${FIXTURE_NAMESPACE}-fp-shared-risk`,
          defaultSelected: true,
          bankName: `Cross Border Bank`,
          bankLast4: `3111`,
          bankCountry: `IN`,
          bankCurrency: $Enums.CurrencyCode.USD,
          serviceFee: 2,
          billingEmail: `billing.arjun@remoola.local`,
          billingName: `Arjun Mehta Studio`,
          billingPhone: `+91115550911`,
          createdAt: daysAgo(now, 4),
        },
      ],
      resources: [],
      notes: [
        {
          adminKey: `risk`,
          content: `[${FIXTURE_NAMESPACE}] Auth spike fixture with device and IP reuse.`,
          createdAt: hoursAgo(now, 2),
        },
      ],
      flags: [
        {
          flag: `auth_watch`,
          reason: `Multiple login failures and shared device footprint`,
          adminKey: `risk`,
          createdAt: hoursAgo(now, 2),
        },
      ],
      authSessions: [
        {
          appScope: `${FIXTURE_NAMESPACE}-consumer-web`,
          sessionFamilyId: `00000000-0000-4000-8000-000000000104`,
          refreshTokenHash: `${FIXTURE_NAMESPACE}-refresh-hash-suspicious`,
          accessTokenHash: `${FIXTURE_NAMESPACE}-access-hash-suspicious`,
          createdAt: daysAgo(now, 1),
          expiresAt: daysFromNow(now, 14),
          lastUsedAt: hoursAgo(now, 1),
          revokedAt: hoursAgo(now, 1),
          invalidatedReason: `admin_deactivated`,
        },
      ],
      authAudits: [
        {
          identityType: `consumer`,
          email: consumerEmail(`suspicious-auth-consumer`),
          event: `login_failure`,
          ipAddress: `203.0.113.200`,
          userAgent: `Chrome / Android`,
          createdAt: hoursAgo(now, 4),
        },
        {
          identityType: `consumer`,
          email: consumerEmail(`suspicious-auth-consumer`),
          event: `login_failure`,
          ipAddress: `203.0.113.200`,
          userAgent: `Chrome / Android`,
          createdAt: hoursAgo(now, 3),
        },
        {
          identityType: `consumer`,
          email: consumerEmail(`suspicious-auth-consumer`),
          event: `login_failure`,
          ipAddress: `203.0.113.200`,
          userAgent: `Chrome / Android`,
          createdAt: hoursAgo(now, 2),
        },
        {
          identityType: `consumer`,
          email: consumerEmail(`suspicious-auth-consumer`),
          event: `login_success`,
          ipAddress: `198.51.100.200`,
          userAgent: `Chrome / Android`,
          createdAt: hoursAgo(now, 1),
        },
      ],
      consumerActions: [
        {
          deviceId: `${FIXTURE_NAMESPACE}-device-risk-shared`,
          action: `login_attempt`,
          metadata: metadata({ scenario: `suspicious-auth-consumer`, outcome: `failure` }),
          ipAddress: `203.0.113.200`,
          userAgent: `Chrome / Android`,
          correlationId: `${FIXTURE_NAMESPACE}-corr-auth-risk`,
          createdAt: hoursAgo(now, 4),
        },
        {
          deviceId: `${FIXTURE_NAMESPACE}-device-risk-shared`,
          action: `login_attempt`,
          metadata: metadata({ scenario: `suspicious-auth-consumer`, outcome: `failure` }),
          ipAddress: `203.0.113.200`,
          userAgent: `Chrome / Android`,
          correlationId: `${FIXTURE_NAMESPACE}-corr-auth-risk`,
          createdAt: hoursAgo(now, 3),
        },
        {
          deviceId: `${FIXTURE_NAMESPACE}-device-risk-shared`,
          action: `payment_method_added`,
          resource: `payment_method`,
          resourceId: `suspicious-bank`,
          metadata: metadata({ scenario: `suspicious-auth-consumer` }),
          ipAddress: `198.51.100.200`,
          userAgent: `Chrome / Android`,
          correlationId: `${FIXTURE_NAMESPACE}-corr-auth-risk`,
          createdAt: hoursAgo(now, 1),
        },
      ],
    },
  ];

  const paymentRequests: ScenarioPaymentRequest[] = [
    {
      key: `healthy-completed-payment`,
      requesterKey: `healthy-approved-consumer`,
      payerKey: `overdue-payment-consumer`,
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.COMPLETED,
      paymentRail: $Enums.PaymentRail.CARD,
      amount: 4800,
      description: `Fixture admin-v2 completed payment between healthy and overdue cases`,
      dueDate: daysAgo(now, 14),
      sentDate: daysAgo(now, 18),
      createdByKey: `healthy-approved-consumer`,
      updatedByKey: `healthy-approved-consumer`,
      createdAt: daysAgo(now, 18),
      updatedAt: daysAgo(now, 6),
    },
    {
      key: `overdue-payment-request`,
      requesterKey: `overdue-payment-consumer`,
      payerEmail: `ap@external-buyer.test`,
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.PENDING,
      paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
      amount: 2600,
      description: `Fixture admin-v2 overdue payment request waiting on external payer`,
      dueDate: daysAgo(now, 6),
      sentDate: daysAgo(now, 9),
      createdByKey: `overdue-payment-consumer`,
      updatedByKey: `overdue-payment-consumer`,
      createdAt: daysAgo(now, 9),
      updatedAt: daysAgo(now, 2),
    },
    {
      key: `uncollectible-payment-request`,
      requesterKey: `uncollectible-payment-consumer`,
      payerEmail: `finance@ghost-vendor.test`,
      currencyCode: $Enums.CurrencyCode.EUR,
      status: $Enums.TransactionStatus.UNCOLLECTIBLE,
      paymentRail: $Enums.PaymentRail.BANK_TRANSFER,
      amount: 1900,
      description: `Fixture admin-v2 uncollectible payment request for write-off review`,
      dueDate: daysAgo(now, 14),
      sentDate: daysAgo(now, 18),
      createdByKey: `uncollectible-payment-consumer`,
      updatedByKey: `uncollectible-payment-consumer`,
      createdAt: daysAgo(now, 18),
      updatedAt: daysAgo(now, 1),
    },
    {
      key: `flagged-risk-denied-payment`,
      requesterKey: `flagged-risk-consumer`,
      payerKey: `healthy-approved-consumer`,
      currencyCode: $Enums.CurrencyCode.EUR,
      status: $Enums.TransactionStatus.DENIED,
      paymentRail: $Enums.PaymentRail.CARD,
      amount: 750,
      description: `Fixture admin-v2 denied payment request linked to flagged verification`,
      dueDate: daysAgo(now, 2),
      sentDate: daysAgo(now, 4),
      createdByKey: `flagged-risk-consumer`,
      updatedByKey: `flagged-risk-consumer`,
      createdAt: daysAgo(now, 4),
      updatedAt: daysAgo(now, 1),
    },
    {
      key: `document-gap-payment-request`,
      requesterKey: `document-gap-consumer`,
      payerKey: `healthy-approved-consumer`,
      currencyCode: $Enums.CurrencyCode.EUR,
      status: $Enums.TransactionStatus.WAITING_RECIPIENT_APPROVAL,
      paymentRail: $Enums.PaymentRail.SEPA_TRANSFER,
      amount: 1350,
      description: `Fixture admin-v2 payment request missing document attachment linkage`,
      dueDate: daysFromNow(now, 2),
      sentDate: daysAgo(now, 1),
      createdByKey: `document-gap-consumer`,
      updatedByKey: `document-gap-consumer`,
      createdAt: daysAgo(now, 2),
      updatedAt: daysAgo(now, 1),
    },
    {
      key: `external-counterparty-contract`,
      requesterKey: `healthy-approved-consumer`,
      payerEmail: `treasury@external-partner.test`,
      currencyCode: $Enums.CurrencyCode.GBP,
      status: $Enums.TransactionStatus.COMPLETED,
      paymentRail: $Enums.PaymentRail.SWIFT_TRANSFER,
      amount: 5300,
      description: `Fixture admin-v2 nullable-FK contract coverage via payerEmail fallback`,
      dueDate: daysAgo(now, 24),
      sentDate: daysAgo(now, 28),
      createdByKey: `healthy-approved-consumer`,
      updatedByKey: `healthy-approved-consumer`,
      createdAt: daysAgo(now, 28),
      updatedAt: daysAgo(now, 21),
    },
  ];

  const ledgerEntries: ScenarioLedgerEntry[] = [
    {
      key: `healthy-completed-payment-payer-entry`,
      ledgerKey: `10000000-0000-4000-8000-000000000001`,
      consumerKey: `overdue-payment-consumer`,
      paymentRequestKey: `healthy-completed-payment`,
      type: $Enums.LedgerEntryType.USER_PAYMENT,
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.COMPLETED,
      amount: -4800,
      feesType: $Enums.TransactionFeesType.NO_FEES_INCLUDED,
      stripeId: `${FIXTURE_NAMESPACE}-pi-healthy-completed`,
      idempotencyKey: `${FIXTURE_NAMESPACE}-idem-healthy-completed-payer`,
      metadata: metadata({
        scenario: `healthy-completed-payment`,
        rail: $Enums.PaymentRail.CARD,
        side: `payer`,
      }),
      createdByKey: `healthy-approved-consumer`,
      updatedByKey: `healthy-approved-consumer`,
      createdAt: daysAgo(now, 18),
      updatedAt: daysAgo(now, 6),
      outcomes: [
        {
          status: $Enums.TransactionStatus.WAITING,
          source: `stripe`,
          externalId: `${FIXTURE_NAMESPACE}-wait-1`,
          createdAt: daysAgo(now, 18),
        },
        {
          status: $Enums.TransactionStatus.PENDING,
          source: `stripe`,
          externalId: `${FIXTURE_NAMESPACE}-pending-1`,
          createdAt: daysAgo(now, 17),
        },
        {
          status: $Enums.TransactionStatus.COMPLETED,
          source: `stripe`,
          externalId: `${FIXTURE_NAMESPACE}-complete-1`,
          createdAt: daysAgo(now, 16),
        },
      ],
      disputes: [
        {
          stripeDisputeId: `${FIXTURE_NAMESPACE}-dp-open-healthy`,
          metadata: metadata({
            scenario: `healthy-completed-payment`,
            disputeStatus: `open`,
            reason: `fraudulent`,
          }),
          createdAt: daysAgo(now, 2),
        },
      ],
    },
    {
      key: `healthy-completed-payment-requester-entry`,
      ledgerKey: `10000000-0000-4000-8000-000000000001`,
      consumerKey: `healthy-approved-consumer`,
      paymentRequestKey: `healthy-completed-payment`,
      type: $Enums.LedgerEntryType.USER_PAYMENT,
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.COMPLETED,
      amount: 4800,
      feesType: $Enums.TransactionFeesType.NO_FEES_INCLUDED,
      stripeId: `${FIXTURE_NAMESPACE}-pi-healthy-completed`,
      idempotencyKey: `${FIXTURE_NAMESPACE}-idem-healthy-completed-requester`,
      metadata: metadata({
        scenario: `healthy-completed-payment`,
        rail: $Enums.PaymentRail.CARD,
        side: `requester`,
      }),
      createdByKey: `healthy-approved-consumer`,
      updatedByKey: `healthy-approved-consumer`,
      createdAt: daysAgo(now, 18),
      updatedAt: daysAgo(now, 6),
      outcomes: [
        {
          status: $Enums.TransactionStatus.WAITING,
          source: `stripe`,
          externalId: `${FIXTURE_NAMESPACE}-wait-2`,
          createdAt: daysAgo(now, 18),
        },
        {
          status: $Enums.TransactionStatus.PENDING,
          source: `stripe`,
          externalId: `${FIXTURE_NAMESPACE}-pending-2`,
          createdAt: daysAgo(now, 17),
        },
        {
          status: $Enums.TransactionStatus.COMPLETED,
          source: `stripe`,
          externalId: `${FIXTURE_NAMESPACE}-complete-2`,
          createdAt: daysAgo(now, 16),
        },
      ],
      disputes: [],
    },
    {
      key: `external-counterparty-credit-entry`,
      ledgerKey: `10000000-0000-4000-8000-000000000002`,
      consumerKey: `healthy-approved-consumer`,
      paymentRequestKey: `external-counterparty-contract`,
      type: $Enums.LedgerEntryType.USER_PAYMENT,
      currencyCode: $Enums.CurrencyCode.GBP,
      status: $Enums.TransactionStatus.COMPLETED,
      amount: 5300,
      stripeId: `${FIXTURE_NAMESPACE}-swift-external-1`,
      idempotencyKey: `${FIXTURE_NAMESPACE}-idem-external-counterparty`,
      metadata: metadata({
        scenario: `external-counterparty-contract`,
        rail: $Enums.PaymentRail.SWIFT_TRANSFER,
        counterpartyEmail: `treasury@external-partner.test`,
      }),
      createdByKey: `healthy-approved-consumer`,
      updatedByKey: `healthy-approved-consumer`,
      createdAt: daysAgo(now, 28),
      updatedAt: daysAgo(now, 21),
      outcomes: [
        {
          status: $Enums.TransactionStatus.PENDING,
          source: `swift`,
          externalId: `${FIXTURE_NAMESPACE}-swift-pending`,
          createdAt: daysAgo(now, 27),
        },
        {
          status: $Enums.TransactionStatus.COMPLETED,
          source: `swift`,
          externalId: `${FIXTURE_NAMESPACE}-swift-completed`,
          createdAt: daysAgo(now, 26),
        },
      ],
      disputes: [],
    },
    {
      key: `flagged-denied-ledger-entry`,
      ledgerKey: `10000000-0000-4000-8000-000000000003`,
      consumerKey: `flagged-risk-consumer`,
      paymentRequestKey: `flagged-risk-denied-payment`,
      type: $Enums.LedgerEntryType.USER_PAYMENT,
      currencyCode: $Enums.CurrencyCode.EUR,
      status: $Enums.TransactionStatus.DENIED,
      amount: 750,
      stripeId: `${FIXTURE_NAMESPACE}-pi-flagged-denied`,
      idempotencyKey: `${FIXTURE_NAMESPACE}-idem-flagged-denied`,
      metadata: metadata({
        scenario: `flagged-risk-denied-payment`,
        rail: $Enums.PaymentRail.CARD,
        denialReason: `risk_manual_block`,
      }),
      createdByKey: `flagged-risk-consumer`,
      updatedByKey: `flagged-risk-consumer`,
      createdAt: daysAgo(now, 4),
      updatedAt: daysAgo(now, 1),
      outcomes: [
        {
          status: $Enums.TransactionStatus.WAITING,
          source: `stripe`,
          externalId: `${FIXTURE_NAMESPACE}-flagged-waiting`,
          createdAt: daysAgo(now, 4),
        },
        {
          status: $Enums.TransactionStatus.DENIED,
          source: `risk-review`,
          externalId: `${FIXTURE_NAMESPACE}-flagged-denied`,
          createdAt: daysAgo(now, 1),
        },
      ],
      disputes: [],
    },
    {
      key: `payout-failed-ledger-entry`,
      ledgerKey: `10000000-0000-4000-8000-000000000004`,
      consumerKey: `payout-failure-consumer`,
      type: $Enums.LedgerEntryType.USER_PAYOUT,
      currencyCode: $Enums.CurrencyCode.EUR,
      status: $Enums.TransactionStatus.DENIED,
      amount: -2100,
      feesType: $Enums.TransactionFeesType.FEES_INCLUDED,
      feesAmount: 30,
      stripeId: `${FIXTURE_NAMESPACE}-po-failed`,
      idempotencyKey: `${FIXTURE_NAMESPACE}-idem-payout-failed`,
      metadata: metadata({
        scenario: `payout-failure-consumer`,
        payoutReference: `${FIXTURE_NAMESPACE}-payout-ref-1`,
        destinationPaymentMethodKey: `payout-bank`,
      }),
      createdByKey: `payout-failure-consumer`,
      updatedByKey: `payout-failure-consumer`,
      createdAt: daysAgo(now, 1),
      updatedAt: hoursAgo(now, 4),
      outcomes: [
        {
          status: $Enums.TransactionStatus.PENDING,
          source: `stripe-payout`,
          externalId: `${FIXTURE_NAMESPACE}-payout-pending`,
          createdAt: daysAgo(now, 1),
        },
        {
          status: $Enums.TransactionStatus.DENIED,
          source: `stripe-payout`,
          externalId: `${FIXTURE_NAMESPACE}-payout-denied`,
          createdAt: hoursAgo(now, 4),
        },
      ],
      disputes: [],
    },
    {
      key: `payout-stuck-ledger-entry`,
      ledgerKey: `10000000-0000-4000-8000-000000000005`,
      consumerKey: `payout-failure-consumer`,
      type: $Enums.LedgerEntryType.USER_PAYOUT,
      currencyCode: $Enums.CurrencyCode.EUR,
      status: $Enums.TransactionStatus.PENDING,
      amount: -900,
      stripeId: `${FIXTURE_NAMESPACE}-po-stuck`,
      idempotencyKey: `${FIXTURE_NAMESPACE}-idem-payout-stuck`,
      metadata: metadata({
        scenario: `payout-failure-consumer`,
        payoutReference: `${FIXTURE_NAMESPACE}-payout-ref-2`,
        destinationPaymentMethodKey: `payout-bank`,
      }),
      createdByKey: `payout-failure-consumer`,
      updatedByKey: `payout-failure-consumer`,
      createdAt: daysAgo(now, 2),
      updatedAt: hoursAgo(now, 10),
      outcomes: [
        {
          status: $Enums.TransactionStatus.PENDING,
          source: `stripe-payout`,
          externalId: `${FIXTURE_NAMESPACE}-payout-stuck-pending`,
          createdAt: daysAgo(now, 2),
        },
      ],
      disputes: [],
    },
    {
      key: `fx-executed-ledger-entry`,
      ledgerKey: `10000000-0000-4000-8000-000000000006`,
      consumerKey: `healthy-approved-consumer`,
      type: $Enums.LedgerEntryType.CURRENCY_EXCHANGE,
      currencyCode: $Enums.CurrencyCode.USD,
      status: $Enums.TransactionStatus.COMPLETED,
      amount: -1000,
      idempotencyKey: `${FIXTURE_NAMESPACE}-idem-fx-executed`,
      metadata: metadata({
        scenario: `healthy-approved-consumer`,
        fxPair: `USD/EUR`,
        destinationCurrency: `EUR`,
      }),
      createdByKey: `healthy-approved-consumer`,
      updatedByKey: `healthy-approved-consumer`,
      createdAt: daysAgo(now, 3),
      updatedAt: daysAgo(now, 3),
      outcomes: [
        {
          status: $Enums.TransactionStatus.PENDING,
          source: `fx-engine`,
          externalId: `${FIXTURE_NAMESPACE}-fx-pending`,
          createdAt: daysAgo(now, 3),
        },
        {
          status: $Enums.TransactionStatus.COMPLETED,
          source: `fx-engine`,
          externalId: `${FIXTURE_NAMESPACE}-fx-completed`,
          createdAt: daysAgo(now, 3),
        },
      ],
      disputes: [],
    },
  ];

  const exchangeRates: ScenarioExchangeRate[] = [
    {
      key: `usd-eur-live`,
      fromCurrency: $Enums.CurrencyCode.USD,
      toCurrency: $Enums.CurrencyCode.EUR,
      rate: `0.92450000`,
      rateBid: `0.92380000`,
      rateAsk: `0.92520000`,
      spreadBps: 14,
      status: $Enums.ExchangeRateStatus.APPROVED,
      effectiveAt: hoursAgo(now, 6),
      expiresAt: daysFromNow(now, 2),
      fetchedAt: hoursAgo(now, 6),
      provider: FIXTURE_NAMESPACE,
      providerRateId: `${FIXTURE_NAMESPACE}-rate-usd-eur-live`,
      confidence: 97,
      approvedByAdminKey: `ops`,
      approvedAt: hoursAgo(now, 5),
      createdAt: hoursAgo(now, 6),
      updatedAt: hoursAgo(now, 5),
    },
    {
      key: `eur-jpy-stale`,
      fromCurrency: $Enums.CurrencyCode.EUR,
      toCurrency: $Enums.CurrencyCode.JPY,
      rate: `161.55000000`,
      rateBid: `161.22000000`,
      rateAsk: `161.88000000`,
      spreadBps: 20,
      status: $Enums.ExchangeRateStatus.APPROVED,
      effectiveAt: daysAgo(now, 9),
      expiresAt: daysAgo(now, 2),
      fetchedAt: daysAgo(now, 9),
      provider: FIXTURE_NAMESPACE,
      providerRateId: `${FIXTURE_NAMESPACE}-rate-eur-jpy-stale`,
      confidence: 62,
      approvedByAdminKey: `ops`,
      approvedAt: daysAgo(now, 8),
      createdAt: daysAgo(now, 9),
      updatedAt: daysAgo(now, 8),
    },
    {
      key: `usd-gbp-draft`,
      fromCurrency: $Enums.CurrencyCode.USD,
      toCurrency: $Enums.CurrencyCode.GBP,
      rate: `0.77000000`,
      rateBid: `0.76900000`,
      rateAsk: `0.77100000`,
      spreadBps: 12,
      status: $Enums.ExchangeRateStatus.DRAFT,
      effectiveAt: daysFromNow(now, 1),
      expiresAt: daysFromNow(now, 4),
      fetchedAt: hoursAgo(now, 2),
      provider: FIXTURE_NAMESPACE,
      providerRateId: `${FIXTURE_NAMESPACE}-rate-usd-gbp-draft`,
      confidence: 88,
      createdAt: hoursAgo(now, 2),
      updatedAt: hoursAgo(now, 2),
    },
    {
      key: `usd-aud-disabled`,
      fromCurrency: $Enums.CurrencyCode.USD,
      toCurrency: $Enums.CurrencyCode.AUD,
      rate: `1.51000000`,
      rateBid: `1.50800000`,
      rateAsk: `1.51200000`,
      spreadBps: 18,
      status: $Enums.ExchangeRateStatus.DISABLED,
      effectiveAt: daysAgo(now, 12),
      expiresAt: daysAgo(now, 1),
      fetchedAt: daysAgo(now, 12),
      provider: FIXTURE_NAMESPACE,
      providerRateId: `${FIXTURE_NAMESPACE}-rate-usd-aud-disabled`,
      confidence: 71,
      createdAt: daysAgo(now, 12),
      updatedAt: daysAgo(now, 1),
    },
  ];

  const walletRules: ScenarioWalletRule[] = [
    {
      consumerKey: `healthy-approved-consumer`,
      fromCurrency: $Enums.CurrencyCode.USD,
      toCurrency: $Enums.CurrencyCode.EUR,
      targetBalance: 5000,
      maxConvertAmount: 1200,
      minIntervalMinutes: 60,
      nextRunAt: daysFromNow(now, 1),
      lastRunAt: daysAgo(now, 3),
      enabled: true,
      metadata: metadata({ scenario: `healthy-approved-consumer`, ruleKind: `normal` }),
      createdAt: daysAgo(now, 14),
      updatedAt: daysAgo(now, 3),
    },
    {
      consumerKey: `fx-failed-consumer`,
      fromCurrency: $Enums.CurrencyCode.JPY,
      toCurrency: $Enums.CurrencyCode.USD,
      targetBalance: 250000,
      maxConvertAmount: 90000,
      minIntervalMinutes: 120,
      nextRunAt: hoursAgo(now, 1),
      lastRunAt: hoursAgo(now, 6),
      enabled: true,
      metadata: metadata({ scenario: `fx-failed-consumer`, ruleKind: `retry-prone` }),
      createdAt: daysAgo(now, 10),
      updatedAt: hoursAgo(now, 6),
    },
    {
      consumerKey: `document-gap-consumer`,
      fromCurrency: $Enums.CurrencyCode.EUR,
      toCurrency: $Enums.CurrencyCode.USD,
      targetBalance: 1200,
      maxConvertAmount: 350,
      minIntervalMinutes: 1440,
      nextRunAt: daysFromNow(now, 4),
      lastRunAt: daysAgo(now, 6),
      enabled: false,
      metadata: metadata({ scenario: `document-gap-consumer`, ruleKind: `paused` }),
      createdAt: daysAgo(now, 20),
      updatedAt: daysAgo(now, 6),
    },
  ];

  const scheduledConversions: ScenarioScheduledConversion[] = [
    {
      key: `healthy-fx-executed`,
      consumerKey: `healthy-approved-consumer`,
      fromCurrency: $Enums.CurrencyCode.USD,
      toCurrency: $Enums.CurrencyCode.EUR,
      amount: 1000,
      status: $Enums.ScheduledFxConversionStatus.EXECUTED,
      executeAt: daysAgo(now, 3),
      processingAt: daysAgo(now, 3),
      executedAt: daysAgo(now, 3),
      attempts: 1,
      ledgerEntryKey: `fx-executed-ledger-entry`,
      metadata: metadata({ scenario: `healthy-approved-consumer`, fxCase: `executed` }),
      createdAt: daysAgo(now, 4),
      updatedAt: daysAgo(now, 3),
    },
    {
      key: `fx-failed-run`,
      consumerKey: `fx-failed-consumer`,
      fromCurrency: $Enums.CurrencyCode.JPY,
      toCurrency: $Enums.CurrencyCode.USD,
      amount: 85000,
      status: $Enums.ScheduledFxConversionStatus.FAILED,
      executeAt: hoursAgo(now, 7),
      processingAt: hoursAgo(now, 6),
      failedAt: hoursAgo(now, 6),
      attempts: 3,
      lastError: `provider timeout while confirming executable rate`,
      metadata: metadata({ scenario: `fx-failed-consumer`, fxCase: `failed` }),
      createdAt: daysAgo(now, 1),
      updatedAt: hoursAgo(now, 6),
    },
    {
      key: `fx-processing-run`,
      consumerKey: `fx-failed-consumer`,
      fromCurrency: $Enums.CurrencyCode.JPY,
      toCurrency: $Enums.CurrencyCode.USD,
      amount: 23000,
      status: $Enums.ScheduledFxConversionStatus.PROCESSING,
      executeAt: hoursAgo(now, 1),
      processingAt: hoursAgo(now, 1),
      attempts: 1,
      metadata: metadata({ scenario: `fx-failed-consumer`, fxCase: `processing` }),
      createdAt: hoursAgo(now, 2),
      updatedAt: hoursAgo(now, 1),
    },
    {
      key: `fx-pending-run`,
      consumerKey: `healthy-approved-consumer`,
      fromCurrency: $Enums.CurrencyCode.USD,
      toCurrency: $Enums.CurrencyCode.GBP,
      amount: 1200,
      status: $Enums.ScheduledFxConversionStatus.PENDING,
      executeAt: hoursAgo(now, 2),
      attempts: 0,
      metadata: metadata({ scenario: `healthy-approved-consumer`, fxCase: `pending` }),
      createdAt: hoursAgo(now, 6),
      updatedAt: hoursAgo(now, 6),
    },
  ];

  const adminActionAudits: ScenarioAdminActionAudit[] = [
    {
      adminKey: `support`,
      action: `consumer_note_create`,
      resource: `consumer`,
      resourceKey: `healthy-approved-consumer`,
      metadata: metadata({ scenario: `healthy-approved-consumer`, noteKind: `baseline` }),
      ipAddress: `10.10.0.11`,
      userAgent: `Admin V2 / Support`,
      createdAt: daysAgo(now, 5),
    },
    {
      adminKey: `risk`,
      action: `verification_request_info`,
      resource: `consumer`,
      resourceKey: `more-info-consumer`,
      metadata: metadata({ scenario: `more-info-consumer`, reason: `ownership proof unreadable` }),
      ipAddress: `10.10.0.22`,
      userAgent: `Admin V2 / Risk`,
      createdAt: daysAgo(now, 4),
    },
    {
      adminKey: `risk`,
      action: `verification_flag`,
      resource: `consumer`,
      resourceKey: `flagged-risk-consumer`,
      metadata: metadata({ scenario: `flagged-risk-consumer`, reason: `shared destination fingerprint` }),
      ipAddress: `10.10.0.22`,
      userAgent: `Admin V2 / Risk`,
      createdAt: hoursAgo(now, 18),
    },
    {
      adminKey: `risk`,
      action: `verification_reject`,
      resource: `consumer`,
      resourceKey: `rejected-consumer`,
      metadata: metadata({ scenario: `rejected-consumer`, reason: `unsupported jurisdiction` }),
      ipAddress: `10.10.0.22`,
      userAgent: `Admin V2 / Risk`,
      createdAt: daysAgo(now, 6),
    },
    {
      adminKey: `ops`,
      action: `consumer_flag_add`,
      resource: `consumer`,
      resourceKey: `overdue-payment-consumer`,
      metadata: metadata({ scenario: `overdue-payment-consumer`, flag: `collections_watch` }),
      ipAddress: `10.10.0.33`,
      userAgent: `Admin V2 / Ops`,
      createdAt: daysAgo(now, 2),
    },
    {
      adminKey: `ops`,
      action: `payout_escalate`,
      resource: `ledger_entry`,
      resourceKey: `payout-failed-ledger-entry`,
      metadata: metadata({ scenario: `payout-failure-consumer`, reason: `terminal denial from payout provider` }),
      ipAddress: `10.10.0.33`,
      userAgent: `Admin V2 / Ops`,
      createdAt: hoursAgo(now, 4),
    },
    {
      adminKey: `risk`,
      action: `consumer_force_logout`,
      resource: `consumer`,
      resourceKey: `suspicious-auth-consumer`,
      metadata: metadata({ scenario: `suspicious-auth-consumer`, reason: `auth spike investigation` }),
      ipAddress: `10.10.0.22`,
      userAgent: `Admin V2 / Risk`,
      createdAt: hoursAgo(now, 1),
    },
    {
      adminKey: `ops`,
      action: `exchange_rule_pause`,
      resource: `wallet_auto_conversion_rule`,
      resourceKey: `document-gap-consumer`,
      metadata: metadata({ scenario: `document-gap-consumer`, reason: `documents incomplete before auto FX` }),
      ipAddress: `10.10.0.33`,
      userAgent: `Admin V2 / Ops`,
      createdAt: daysAgo(now, 6),
    },
  ];

  const lockouts: ScenarioLockout[] = [
    {
      identityType: `consumer`,
      email: consumerEmail(`suspicious-auth-consumer`),
      attemptCount: 5,
      firstAttemptAt: hoursAgo(now, 4),
      lockedUntil: hoursAgo(now, 1),
      updatedAt: hoursAgo(now, 1),
    },
  ];

  assertConsumerAccountShapes(consumers);

  return {
    namespace: FIXTURE_NAMESPACE,
    seedVersion: FIXTURE_SEED_VERSION,
    documentTags,
    admins,
    consumers,
    paymentRequests,
    ledgerEntries,
    exchangeRates,
    walletRules,
    scheduledConversions,
    adminActionAudits,
    lockouts,
  };
}
