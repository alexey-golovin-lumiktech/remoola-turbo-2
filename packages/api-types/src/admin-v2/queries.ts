export type AdminV2CursorQuery = {
  cursor?: string;
  limit?: number;
};

export type AdminV2PageQuery = {
  page?: number;
  pageSize?: number;
};

export type AdminV2DateRangeQuery = {
  dateFrom?: string;
  dateTo?: string;
};

export type AdminV2PaymentsListQuery = AdminV2CursorQuery & {
  q?: string;
  status?: string;
  paymentRail?: string;
  currencyCode?: string;
  amountMin?: number;
  amountMax?: number;
  dueDateFrom?: string;
  dueDateTo?: string;
  createdFrom?: string;
  createdTo?: string;
  overdue?: boolean;
};

export type AdminV2DocumentsListQuery = AdminV2PageQuery & {
  q?: string;
  consumerId?: string;
  access?: string;
  mimetype?: string;
  sizeMin?: number;
  sizeMax?: number;
  createdFrom?: string;
  createdTo?: string;
  paymentRequestId?: string;
  tag?: string;
  tagId?: string;
  includeDeleted?: boolean;
};

export type AdminV2PaymentMethodsListQuery = AdminV2PageQuery & {
  consumerId?: string;
  type?: string;
  defaultSelected?: boolean;
  fingerprint?: string;
  includeDeleted?: boolean;
};

export type AdminV2ExchangeRatesListQuery = AdminV2PageQuery & {
  fromCurrency?: string;
  toCurrency?: string;
  provider?: string;
  status?: string;
  stale?: boolean;
};

export type AdminV2ExchangeRulesListQuery = AdminV2PageQuery & {
  q?: string;
  enabled?: boolean;
  fromCurrency?: string;
  toCurrency?: string;
};

export type AdminV2ExchangeScheduledListQuery = AdminV2PageQuery & {
  q?: string;
  status?: string;
};

export type AdminV2PayoutsListQuery = AdminV2CursorQuery;

export type AdminV2ConsumersListQuery = AdminV2PageQuery & {
  q?: string;
  accountType?: string;
  contractorKind?: string;
  verificationStatus?: string;
  includeDeleted?: boolean;
};

export type AdminV2VerificationQueueQuery = AdminV2PageQuery & {
  status?: string;
  stripeIdentityStatus?: string;
  country?: string;
  contractorKind?: string;
  missingProfileData?: boolean;
  missingDocuments?: boolean;
};

export type AdminV2ConsumerContractsQuery = AdminV2PageQuery & {
  role?: string;
  status?: string;
};

export type AdminV2LedgerEntriesListQuery = AdminV2CursorQuery & {
  q?: string;
  type?: string;
  status?: string;
  currencyCode?: string;
  amountSign?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type AdminV2LedgerDisputesQuery = AdminV2CursorQuery & {
  status?: string;
  dateFrom?: string;
  dateTo?: string;
};

export type AdminV2LedgerAnomaliesListQuery = AdminV2CursorQuery &
  AdminV2DateRangeQuery & {
    class: string;
  };

export type AdminV2TimelineQuery = AdminV2PageQuery &
  AdminV2DateRangeQuery & {
    event?: string;
    action?: string;
  };

export type AdminV2AuditListQuery = AdminV2PageQuery &
  AdminV2DateRangeQuery & {
    event?: string;
    action?: string;
    adminId?: string;
    email?: string;
    resourceId?: string;
  };

export type AdminV2AdminsListQuery = AdminV2PageQuery & {
  q?: string;
  status?: string;
};
