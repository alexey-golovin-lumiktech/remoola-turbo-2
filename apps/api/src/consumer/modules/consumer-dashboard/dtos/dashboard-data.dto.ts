export class DashboardSummary {
  balanceCents: number;
  activeRequests: number;
  lastPaymentAt: Date | string | null;
}

export class PendingRequest {
  id: string;
  counterpartyName: string;
  amount: number;
  currencyCode: string;
  status: string;
  lastActivityAt: Date | string | null;
}

export class ActivityItem {
  id: string;
  label: string;
  description?: string;
  createdAt: string;
  kind: string;
}

export class ComplianceTask {
  id: string;
  label: string;
  completed: boolean;
}

export class QuickDoc {
  id: string;
  name: string;
  createdAt: string;
}

export class DashboardData {
  summary: DashboardSummary;
  pendingRequests: PendingRequest[];
  activity: ActivityItem[];
  tasks: ComplianceTask[];
  quickDocs: QuickDoc[];
}
