import { NextResponse } from 'next/server';

import { getEnv } from '../../../../../lib/env.server';
import { serverLogger } from '../../../../../lib/logger.server';

/**
 * POST /api/consumer/auth/refresh
 * Refreshes the authentication token for the current user session.
 * This endpoint proxies the request to the backend API.
 */
export async function POST(req: Request) {
  const env = getEnv();
  const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;

  if (!baseUrl) {
    return NextResponse.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
  }

  try {
    const url = new URL(`${baseUrl}/consumer/auth/refresh`);
    const res = await fetch(url, {
      method: `POST`,
      headers: {
        ...Object.fromEntries(new Headers(req.headers)),
        'content-type': `application/json`,
      },
      credentials: `include`,
      cache: `no-store`,
    });

    const cookie = res.headers.get(`set-cookie`);
    const data = await res.text();

    const headers: HeadersInit = {};
    if (cookie) {
      headers[`set-cookie`] = cookie;
    }

    return new NextResponse(data, {
      status: res.status,
      headers,
    });
  } catch (error) {
    serverLogger.error(`Auth refresh failed`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return NextResponse.json(
      {
        code: `REFRESH_FAILED`,
        message: `Failed to refresh authentication token`,
      },
      { status: 500 },
    );
  }
}
