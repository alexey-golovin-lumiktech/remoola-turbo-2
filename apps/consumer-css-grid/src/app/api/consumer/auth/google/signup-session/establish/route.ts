import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import { buildAuthMutationForwardHeaders, requireJsonBody } from '../../../../../../../lib/api-utils';
import {
  buildConsumerUpstreamUrl,
  getConsumerApiBaseUrlResponse,
  proxyTextRoute,
} from '../../../../../../../lib/bff-proxy.server';

export async function POST(req: Request) {
  const bodyResult = await requireJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;

  const baseUrlResult = getConsumerApiBaseUrlResponse();
  if (!baseUrlResult.ok) return baseUrlResult.response;

  const forwardHeaders = buildAuthMutationForwardHeaders(req.headers);
  forwardHeaders.set(`content-type`, `application/json`);

  return proxyTextRoute({
    url: buildConsumerUpstreamUrl(baseUrlResult.baseUrl, `/api/consumer/auth/google/signup-session/establish`, [
      [`appScope`, CURRENT_CONSUMER_APP_SCOPE],
    ]),
    method: `POST`,
    init: {
      headers: forwardHeaders,
      body: bodyResult.body,
      cache: `no-store`,
    },
    appendUpstreamSetCookies: true,
  });
}
