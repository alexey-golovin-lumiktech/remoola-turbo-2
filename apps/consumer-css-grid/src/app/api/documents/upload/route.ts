import { type NextRequest } from 'next/server';

import { buildForwardHeaders } from '../../../../lib/api-utils';
import {
  buildConsumerUpstreamUrl,
  getConsumerApiBaseUrlResponse,
  proxyBinaryRoute,
} from '../../../../lib/bff-proxy.server';

export async function POST(req: NextRequest) {
  const baseUrlResult = getConsumerApiBaseUrlResponse();
  if (!baseUrlResult.ok) return baseUrlResult.response;

  const forwardHeaders = buildForwardHeaders(req.headers);
  forwardHeaders.delete(`host`);
  return proxyBinaryRoute({
    url: buildConsumerUpstreamUrl(baseUrlResult.baseUrl, `/consumer/documents/upload`),
    method: `POST`,
    init: {
      body: req.body,
      credentials: `include`,
      cache: `no-store`,
      headers: forwardHeaders,
      duplex: `half`,
    } as RequestInit,
    appendUpstreamSetCookies: true,
  });
}
