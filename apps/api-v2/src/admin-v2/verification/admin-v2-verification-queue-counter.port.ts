export const ADMIN_V2_VERIFICATION_QUEUE_COUNTER = Symbol(`ADMIN_V2_VERIFICATION_QUEUE_COUNTER`);

export type AdminV2VerificationQueueCountFilters = {
  status?: string;
  stripeIdentityStatus?: string;
  country?: string;
  contractorKind?: string;
  missingProfileData?: boolean;
  missingDocuments?: boolean;
};

export type AdminV2VerificationQueueCounterPort = {
  getQueueCount(filters: AdminV2VerificationQueueCountFilters): Promise<number>;
};
