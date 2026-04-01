export type IDashboardSummary = {
  balanceCents: number;
  activeRequests: number;
  lastPaymentAt: string | null;
};

export type IPendingRequest = {
  id: string;
  counterpartyName: string;
  amount: number; // decimal as number (use string if prefer)
  currencyCode: string;
  status: string;
  lastActivityAt: string | null;
};

export type IActivityItem = {
  id: string;
  label: string;
  description?: string;
  createdAt: string;
  // e.g. "w9_ready" | "kyc_in_review" | "bank_pending"
  kind: string;
};

export type IComplianceTask = {
  id: string;
  label: string;
  completed: boolean;
};

export type IQuickDoc = {
  id: string;
  name: string;
  createdAt: string;
};

export type IPendingWithdrawal = {
  id: string;
  code: string;
  amount: string;
  status: string;
  createdAt: string | null;
};

export type IVerificationState = {
  status: string;
  canStart: boolean;
  profileComplete: boolean;
  legalVerified: boolean;
  effectiveVerified: boolean;
  reviewStatus: string;
  stripeStatus: string;
  sessionId: string | null;
  lastErrorCode: string | null;
  lastErrorReason: string | null;
  startedAt: string | null;
  updatedAt: string | null;
  verifiedAt: string | null;
};

export type IDashboardData = {
  summary: IDashboardSummary;
  pendingRequests: IPendingRequest[];
  pendingWithdrawals: { items: IPendingWithdrawal[]; total: number };
  activity: IActivityItem[];
  tasks: IComplianceTask[];
  quickDocs: IQuickDoc[];
  verification: IVerificationState;
};
