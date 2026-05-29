import { type NextRequest, NextResponse } from 'next/server';

import { CURRENT_CONSUMER_APP_SCOPE } from '@remoola/api-types';

import { buildConsumerUpstreamUrl, getConsumerApiBaseUrlResponse } from '../../../../../../lib/bff-proxy.server';

const ALLOWED_QUERY_PARAMS = [`next`, `signupPath`, `accountType`, `contractorKind`] as const;

export async function GET(req: NextRequest) {
  const baseUrlResult = getConsumerApiBaseUrlResponse();
  if (!baseUrlResult.ok) return baseUrlResult.response;

  const searchParams = new URLSearchParams([[`appScope`, CURRENT_CONSUMER_APP_SCOPE]]);
  for (const key of ALLOWED_QUERY_PARAMS) {
    const value = req.nextUrl.searchParams.get(key);
    if (value) searchParams.set(key, value);
  }

  return NextResponse.redirect(
    buildConsumerUpstreamUrl(baseUrlResult.baseUrl, `/api/consumer/auth/google/start`, searchParams),
  );
}
