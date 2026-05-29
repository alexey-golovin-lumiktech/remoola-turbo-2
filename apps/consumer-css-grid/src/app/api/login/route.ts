import { NextResponse } from 'next/server';

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import { loginSchema } from '../../../features/auth/schemas';
import { buildAuthMutationForwardHeaders } from '../../../lib/api-utils';
import { buildConsumerUpstreamUrl, getConsumerApiBaseUrlResponse, proxyTextRoute } from '../../../lib/bff-proxy.server';

export async function POST(req: Request) {
  const baseUrlResult = getConsumerApiBaseUrlResponse();
  if (!baseUrlResult.ok) return baseUrlResult.response;

  const raw = await req.json().catch(() => null);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { code: `VALIDATION_ERROR`, message: `Invalid login payload`, fieldErrors: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const forwardHeaders = buildAuthMutationForwardHeaders(req.headers);
  forwardHeaders.set(`content-type`, `application/json`);

  return proxyTextRoute({
    url: buildConsumerUpstreamUrl(baseUrlResult.baseUrl, `/api/consumer/auth/login`, [
      [`appScope`, CURRENT_CONSUMER_APP_SCOPE],
    ]),
    method: `POST`,
    init: {
      headers: forwardHeaders,
      body: JSON.stringify(parsed.data),
      cache: `no-store`,
    },
    appendUpstreamSetCookies: true,
  });
}
