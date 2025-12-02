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

export type IDashboardData = {
  summary: IDashboardSummary;
  pendingRequests: IPendingRequest[];
  activity: IActivityItem[];
  tasks: IComplianceTask[];
  quickDocs: IQuickDoc[];
};
