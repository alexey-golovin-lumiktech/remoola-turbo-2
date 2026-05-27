import { buildAuthMutationForwardHeaders, proxyAdminApiRoute } from '../../../../../lib/api-utils';

export async function POST(req: Request) {
  return proxyAdminApiRoute({
    req,
    method: `POST`,
    upstreamPath: `/admin-v2/auth/refresh-access`,
    buildHeaders: buildAuthMutationForwardHeaders,
  });
}
