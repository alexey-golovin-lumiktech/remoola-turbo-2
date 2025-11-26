import { cookies } from 'next/headers';

export type DashboardSummary = {
  balanceCents: number;
  activeRequests: number;
  lastPaymentAt: string | null;
};

export type PendingRequest = {
  id: string;
  counterpartyName: string;
  amount: number; // decimal as number (use string if you prefer)
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

// Helper to hit your Nest API from server components
async function apiGet<T>(path: string): Promise<T> {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore
    .getAll()
    .map((c) => `${c.name}=${encodeURIComponent(c.value)}`)
    .join(`; `);

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL!;
  const res = await fetch(`${baseUrl}${path}`, {
    headers: {
      cookie: cookieHeader,
      authorization: `Basic YWxleGV5LmdvbG92aW5AbHVtaWt0ZWNoLmNvbTphbGV4ZXkuZ29sb3ZpbkBsdW1pa3RlY2guY29t`,
    },
    cache: `no-store`,
  });

  if (!res.ok) {
    console.log(`res`, res);
    // you may want better error handling / redirects here
    throw new Error(`Failed to load ${path}: ${res.status}`);
  }

  return res.json();
}

export async function getDashboardData(): Promise<DashboardData> {
  // You can replace with a single /consumer/dashboard endpoint if you like.
  // For now assume you already have this aggregated endpoint in Nest.
  return apiGet<DashboardData>(`/dashboard`);
}
