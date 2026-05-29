import { buildAuthMutationForwardHeaders } from '../../../../../lib/api-utils';
import {
  buildConsumerUpstreamUrl,
  getConsumerApiBaseUrlResponse,
  proxyTextRoute,
} from '../../../../../lib/bff-proxy.server';

export async function POST(req: Request) {
  const baseUrlResult = getConsumerApiBaseUrlResponse();
  if (!baseUrlResult.ok) return baseUrlResult.response;

  const forwardHeaders = buildAuthMutationForwardHeaders(req.headers);

  return proxyTextRoute({
    url: buildConsumerUpstreamUrl(baseUrlResult.baseUrl, `/api/consumer/auth/refresh`),
    method: `POST`,
    init: {
      headers: forwardHeaders,
      cache: `no-store`,
    },
    appendUpstreamSetCookies: true,
  });
}
