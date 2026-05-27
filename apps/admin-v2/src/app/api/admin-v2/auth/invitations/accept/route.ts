import { buildAuthMutationForwardHeaders, proxyAdminApiRoute, requireJsonBody } from '../../../../../../lib/api-utils';

export async function POST(req: Request) {
  return proxyAdminApiRoute({
    req,
    method: `POST`,
    upstreamPath: `/admin-v2/auth/invitations/accept`,
    buildHeaders(sourceHeaders) {
      const headers = buildAuthMutationForwardHeaders(sourceHeaders);
      headers.set(`content-type`, `application/json`);
      return headers;
    },
    prepareBody: requireJsonBody,
  });
}
