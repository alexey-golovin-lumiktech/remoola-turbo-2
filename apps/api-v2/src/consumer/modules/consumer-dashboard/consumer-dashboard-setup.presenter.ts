import { type ActivityItem, type ComplianceTask } from './dtos/dashboard-data.dto';

type DashboardVerificationState = {
  status: string;
  profileComplete: boolean;
  effectiveVerified: boolean;
  startedAt: string | null;
  updatedAt: string | null;
  verifiedAt: string | null;
};

type DashboardResource = {
  originalName: string;
  createdAt?: Date | null;
};

type DashboardConsumerResource = {
  resource: DashboardResource;
};

type DashboardPaymentMethod = {
  type?: string | null;
  createdAt?: Date | null;
};

type DashboardSetupProjection = {
  consumerResources: DashboardConsumerResource[];
  paymentMethods: DashboardPaymentMethod[];
};

function hasDashboardW9Name(value: string): boolean {
  const normalized = value.toLowerCase();
  return normalized.includes(`w9`) || normalized.includes(`w-9`);
}

function findDashboardW9Resource(
  consumerResources: DashboardConsumerResource[],
): DashboardConsumerResource | undefined {
  return consumerResources.find((consumerResource) => hasDashboardW9Name(consumerResource.resource.originalName));
}

export function buildDashboardSetupActivity(
  consumer: DashboardSetupProjection,
  verification: DashboardVerificationState,
): ActivityItem[] {
  const items: ActivityItem[] = [];

  if (verification.effectiveVerified) {
    items.push({
      id: `kyc`,
      label: `Identity verified`,
      createdAt: verification.verifiedAt ?? verification.updatedAt ?? new Date().toISOString(),
      kind: `kyc_completed`,
    });
  } else if (verification.status === `requires_input` || verification.status === `more_info`) {
    items.push({
      id: `kyc_attention`,
      label: `Verification needs attention`,
      createdAt: verification.updatedAt ?? new Date().toISOString(),
      kind: `kyc_requires_input`,
    });
  } else if (verification.status === `pending_submission`) {
    items.push({
      id: `kyc_started`,
      label: `Verification started`,
      createdAt: verification.startedAt ?? new Date().toISOString(),
      kind: `kyc_started`,
    });
  } else {
    items.push({
      id: `kyc_pending`,
      label: `Identity verification pending`,
      createdAt: new Date().toISOString(),
      kind: `kyc_in_review`,
    });
  }

  const w9 = findDashboardW9Resource(consumer.consumerResources);
  if (w9) {
    items.push({
      id: `w9`,
      label: `W-9 pack ready`,
      createdAt: w9.resource.createdAt?.toISOString() ?? new Date().toISOString(),
      kind: `w9_ready`,
    });
  }

  if (consumer.paymentMethods.length > 0) {
    items.push({
      id: `bank`,
      label: `Bank account added`,
      createdAt: consumer.paymentMethods[0].createdAt?.toISOString() ?? new Date().toISOString(),
      kind: `bank_added`,
    });
  } else {
    items.push({
      id: `bank_pending`,
      label: `Bank details pending`,
      createdAt: new Date().toISOString(),
      kind: `bank_pending`,
    });
  }

  return items.sort((a, b) => new Date(b.createdAt).valueOf() - new Date(a.createdAt).valueOf());
}

export function buildDashboardTasks(
  consumer: DashboardSetupProjection,
  verification: DashboardVerificationState,
): ComplianceTask[] {
  const hasW9 = Boolean(findDashboardW9Resource(consumer.consumerResources));

  return [
    {
      id: `kyc`,
      label: `Complete KYC`,
      completed: verification.effectiveVerified,
    },
    {
      id: `profile`,
      label: `Complete your profile`,
      completed: verification.profileComplete,
    },
    {
      id: `w9`,
      label: `Upload W-9 form`,
      completed: hasW9,
    },
    {
      id: `bank`,
      label: `Add bank account`,
      completed: consumer.paymentMethods.filter((paymentMethod) => paymentMethod.type === `BANK_ACCOUNT`).length > 0,
    },
  ];
}
