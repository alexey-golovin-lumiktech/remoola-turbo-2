import { type NextRequest } from 'next/server';

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import { buildAuthMutationForwardHeaders, requireJsonBody } from '../../../../../lib/api-utils';
import {
  buildConsumerUpstreamUrl,
  getConsumerApiBaseUrlResponse,
  proxyTextRoute,
} from '../../../../../lib/bff-proxy.server';

export async function POST(req: NextRequest) {
  const bodyResult = await requireJsonBody(req);
  if (!bodyResult.ok) return bodyResult.response;

  const baseUrlResult = getConsumerApiBaseUrlResponse();
  if (!baseUrlResult.ok) return baseUrlResult.response;

  const forwardHeaders = buildAuthMutationForwardHeaders(req.headers);
  forwardHeaders.set(`content-type`, `application/json`);

  return proxyTextRoute({
    url: buildConsumerUpstreamUrl(baseUrlResult.baseUrl, `/consumer/auth/forgot-password`, [
      [`appScope`, CURRENT_CONSUMER_APP_SCOPE],
    ]),
    method: `POST`,
    init: {
      headers: forwardHeaders,
      body: bodyResult.body,
      cache: `no-store`,
    },
  });
}
