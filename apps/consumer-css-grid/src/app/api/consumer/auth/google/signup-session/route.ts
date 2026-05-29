import { type NextRequest } from 'next/server';

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import { buildAuthMutationForwardHeaders } from '../../../../../../lib/api-utils';
import {
  buildConsumerUpstreamUrl,
  getConsumerApiBaseUrlResponse,
  proxyTextRoute,
} from '../../../../../../lib/bff-proxy.server';

export async function GET(req: NextRequest) {
  const baseUrlResult = getConsumerApiBaseUrlResponse();
  if (!baseUrlResult.ok) return baseUrlResult.response;

  const forwardHeaders = buildAuthMutationForwardHeaders(req.headers);

  return proxyTextRoute({
    url: buildConsumerUpstreamUrl(baseUrlResult.baseUrl, `/api/consumer/auth/google/signup-session`, [
      [`appScope`, CURRENT_CONSUMER_APP_SCOPE],
    ]),
    method: `GET`,
    init: {
      headers: forwardHeaders,
      cache: `no-store`,
    },
    appendUpstreamSetCookies: true,
  });
}
