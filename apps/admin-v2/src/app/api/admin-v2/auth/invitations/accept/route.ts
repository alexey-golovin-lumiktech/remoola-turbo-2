import { tokenPasswordSchema } from '../../../../../../features/auth/schemas';
import {
  buildAuthMutationForwardHeaders,
  proxyAdminApiRoute,
  requireValidatedJsonBody,
} from '../../../../../../lib/api-utils';

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
    prepareBody(request) {
      return requireValidatedJsonBody(request, tokenPasswordSchema, {
        code: `VALIDATION_ERROR`,
        message: `Invalid invitation-acceptance payload`,
      });
    },
  });
}
