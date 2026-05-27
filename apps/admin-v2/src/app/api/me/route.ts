import { type NextRequest } from 'next/server';

import { buildForwardHeaders, proxyAdminApiRoute } from '../../../lib/api-utils';

export async function GET(req: NextRequest) {
  return proxyAdminApiRoute({
    req,
    method: `GET`,
    upstreamPath: `/admin-v2/me`,
    buildHeaders: buildForwardHeaders,
  });
}
