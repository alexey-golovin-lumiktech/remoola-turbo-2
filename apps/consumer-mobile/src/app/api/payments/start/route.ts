import { type NextRequest } from 'next/server';

import { getEnv } from '../../../../lib/env.server';
import { serverLogger } from '../../../../lib/logger.server';

export async function POST(req: NextRequest) {
  try {
    const env = getEnv();
    const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
    if (!baseUrl) {
      serverLogger.error(`Payments start failed: API base URL not configured`);
      return Response.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
    }

    const body = await req.clone().text();
    serverLogger.info(`Payments start request`, { bodyLength: body.length });

    const url = new URL(`${baseUrl}/consumer/payments/start`);
    serverLogger.debug(`Proxying to backend`, { url: url.toString() });

    const res = await fetch(url, {
      method: `POST`,
      headers: new Headers(req.headers),
      credentials: `include`,
      body,
    });

    serverLogger.info(`Backend response received`, { status: res.status });

    const cookie = res.headers.get(`set-cookie`);
    const data = await res.text();

    if (!res.ok) {
      serverLogger.warn(`Backend returned error`, { status: res.status, responseLength: data.length });
    }

    const headers: HeadersInit = {};
    if (cookie) headers[`set-cookie`] = cookie;
    return new Response(data, { status: res.status, headers });
  } catch (error) {
    serverLogger.error(`Payments start unexpected error`, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return Response.json({ message: `Internal server error`, code: `INTERNAL_ERROR` }, { status: 500 });
  }
}
