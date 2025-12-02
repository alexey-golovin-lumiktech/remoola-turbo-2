import { getAuthHeaders } from './getHeaders';

export type DashboardSummary = {
  balanceCents: number;
  activeRequests: number;
  lastPaymentAt: string | null;
};

export type PendingRequest = {
  id: string;
  counterpartyName: string;
  amount: number; // decimal as number (use string if prefer)
  currencyCode: string;
  status: string;
  lastActivityAt: string | null;
};

export type ActivityItem = {
  id: string;
  label: string;
  description?: string;
  createdAt: string;
  // e.g. "w9_ready" | "kyc_in_review" | "bank_pending"
  kind: string;
};

export type ComplianceTask = {
  id: string;
  label: string;
  completed: boolean;
};

export type QuickDoc = {
  id: string;
  name: string;
  createdAt: string;
};

export type DashboardData = {
  summary: DashboardSummary;
  pendingRequests: PendingRequest[];
  activity: ActivityItem[];
  tasks: ComplianceTask[];
  quickDocs: QuickDoc[];
};

export async function apiGet<T>(path: string): Promise<T> {
  const headers = await getAuthHeaders();

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const res = await fetch(`${baseUrl}${path}`, {
    headers: headers,
    cache: `no-store`,
  });

  if (!res.ok) {
    console.log(`await res.text()`, await res.text());
    // may want better error handling / redirects here
    throw new Error(`Failed to load ${path}: ${res.status}`);
  }

  return res.json();
}
