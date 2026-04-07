import { type NextRequest } from 'next/server';

import { appendSetCookies, requireJsonBody, buildForwardHeaders } from '../../../../lib/api-utils';
import { getEnv } from '../../../../lib/env.server';
import { serverLogger } from '../../../../lib/logger.server';

const APP_SCOPE = `consumer-mobile`;

export async function POST(req: NextRequest) {
  try {
    const bodyResult = await requireJsonBody(req);
    if (!bodyResult.ok) return bodyResult.response;

    const env = getEnv();
    const baseUrl = env.NEXT_PUBLIC_API_BASE_URL;
    if (!baseUrl) {
      serverLogger.error(`Payments start failed: API base URL not configured`);
      return Response.json({ message: `API base URL not configured`, code: `CONFIG_ERROR` }, { status: 503 });
    }

    const body = bodyResult.body;
    serverLogger.info(`Payments start request`, { bodyLength: body.length });

    const url = new URL(`${baseUrl}/consumer/payments/start`);
    url.searchParams.set(`appScope`, APP_SCOPE);
    serverLogger.debug(`Proxying to backend`, { url: url.toString() });

    const res = await fetch(url, {
      method: `POST`,
      headers: buildForwardHeaders(req.headers),
      credentials: `include`,
      cache: `no-store`,
      body,
    });

    serverLogger.info(`Backend response received`, { status: res.status });

    const data = await res.text();

    if (!res.ok) {
      serverLogger.warn(`Backend returned error`, { status: res.status, responseLength: data.length });
    }

    const responseHeaders = new Headers();
    appendSetCookies(responseHeaders, res.headers);
    return new Response(data, { status: res.status, headers: responseHeaders });
  } catch (error) {
    serverLogger.error(`Payments start unexpected error`, {
      error: error instanceof Error ? error : String(error),
    });
    return Response.json({ message: `Internal server error`, code: `INTERNAL_ERROR` }, { status: 500 });
  }
}
