import { NextResponse, type NextRequest } from 'next/server';

import { appendSetCookies, buildForwardHeaders, handleApiError } from '../../../lib/api-utils';

type PendingWithdrawalItem = {
  id: string;
  code: string;
  amount: string;
  status: string;
  createdAt: string | null;
};

type PendingWithdrawalsResponse = {
  items: PendingWithdrawalItem[];
  total: number;
};

function appendDashboardDebugHeaders(
  headers: Headers,
  statuses: { dashboard: number | string; pendingWithdrawals: number | string },
) {
  headers.set(`x-remoola-dashboard-upstream-status`, String(statuses.dashboard));
  headers.set(`x-remoola-dashboard-pending-status`, String(statuses.pendingWithdrawals));
}

export async function GET(req: NextRequest) {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
    const dashboardUrl = `${baseUrl}/consumer/dashboard`;
    const pendingWithdrawalsUrl = new URL(`${baseUrl}/consumer/payments/history`);
    pendingWithdrawalsUrl.searchParams.set(`direction`, `OUTCOME`);
    pendingWithdrawalsUrl.searchParams.set(`status`, `PENDING`);
    pendingWithdrawalsUrl.searchParams.set(`limit`, `5`);

    const dashboardRes = await fetch(dashboardUrl, {
      method: `GET`,
      headers: buildForwardHeaders(req.headers),
      credentials: `include`,
      cache: `no-store`,
      signal: AbortSignal.timeout(15000),
    });

    const dashboardText = await dashboardRes.text();
    const responseHeaders = new Headers();
    appendSetCookies(responseHeaders, dashboardRes.headers);
    appendDashboardDebugHeaders(responseHeaders, {
      dashboard: dashboardRes.status,
      pendingWithdrawals: `skipped`,
    });

    if (!dashboardRes.ok) {
      return new NextResponse(dashboardText, { status: dashboardRes.status, headers: responseHeaders });
    }

    const dashboardData = JSON.parse(dashboardText) as Record<string, unknown>;

    let pendingWithdrawals: PendingWithdrawalsResponse = { items: [], total: 0 };
    let pendingWithdrawalsStatus: number | string = `skipped`;
    const pendingWithdrawalsRes = await fetch(pendingWithdrawalsUrl, {
      method: `GET`,
      headers: buildForwardHeaders(req.headers),
      credentials: `include`,
      cache: `no-store`,
      signal: AbortSignal.timeout(15000),
    }).catch(() => null);

    if (pendingWithdrawalsRes) {
      pendingWithdrawalsStatus = pendingWithdrawalsRes.status;
      appendSetCookies(responseHeaders, pendingWithdrawalsRes.headers);
      if (pendingWithdrawalsRes.ok) {
        const pendingWithdrawalsText = await pendingWithdrawalsRes.text();
        pendingWithdrawals = JSON.parse(pendingWithdrawalsText) as PendingWithdrawalsResponse;
      }
    } else {
      pendingWithdrawalsStatus = `network-error`;
    }

    appendDashboardDebugHeaders(responseHeaders, {
      dashboard: dashboardRes.status,
      pendingWithdrawals: pendingWithdrawalsStatus,
    });

    return NextResponse.json(
      {
        ...dashboardData,
        pendingWithdrawals,
      },
      {
        status: dashboardRes.status,
        headers: responseHeaders,
      },
    );
  } catch (error) {
    return handleApiError(error);
  }
}
