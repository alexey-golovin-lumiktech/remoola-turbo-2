import { type NextRequest, NextResponse } from 'next/server';

import { buildForwardHeaders } from '../../../lib/api-utils';
import { buildConsumerUpstreamUrl, getConsumerApiBaseUrlResponse, proxyJsonRoute } from '../../../lib/bff-proxy.server';

export async function GET(req: NextRequest) {
  const baseUrlResult = getConsumerApiBaseUrlResponse();
  if (!baseUrlResult.ok) return baseUrlResult.response;

  const forwardHeaders = buildForwardHeaders(req.headers);
  forwardHeaders.delete(`host`);

  return proxyJsonRoute({
    url: buildConsumerUpstreamUrl(baseUrlResult.baseUrl, `/api/consumer/auth/me`),
    method: `GET`,
    init: {
      headers: forwardHeaders,
      cache: `no-store`,
    },
    appendUpstreamSetCookies: true,
    onUpstreamError: (upstream, payload, responseHeaders) => {
      const normalizedPayload = payload as { code?: string; message?: string } | null;
      if (normalizedPayload?.code === `NETWORK_ERROR`) {
        return NextResponse.json(normalizedPayload, { status: upstream.status, headers: responseHeaders });
      }
      return NextResponse.json(
        { code: `UPSTREAM_ERROR`, status: upstream.status },
        { status: upstream.status, headers: responseHeaders },
      );
    },
    onInvalidJson: (_upstream, responseHeaders) =>
      NextResponse.json({ code: `INVALID_RESPONSE` }, { status: 502, headers: responseHeaders }),
  });
}
