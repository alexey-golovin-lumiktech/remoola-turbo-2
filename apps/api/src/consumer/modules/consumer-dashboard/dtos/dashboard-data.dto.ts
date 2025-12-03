export class DashboardSummaryDto {
  balanceCents: number;
  activeRequests: number;
  lastPaymentAt: Date | string | null;
}

export class PendingRequestDto {
  id: string;
  counterpartyName: string;
  amount: number;
  currencyCode: string;
  status: string;
  lastActivityAt: Date | string | null;
}

export class ActivityItemDto {
  id: string;
  label: string;
  description?: string;
  createdAt: string;
  kind: string;
}

export class ComplianceTaskDto {
  id: string;
  label: string;
  completed: boolean;
}

export class QuickDocDto {
  id: string;
  name: string;
  createdAt: string;
}

export class DashboardDataDto {
  summary: DashboardSummaryDto;
  pendingRequests: PendingRequestDto[];
  activity: ActivityItemDto[];
  tasks: ComplianceTaskDto[];
  quickDocs: QuickDocDto[];
}
