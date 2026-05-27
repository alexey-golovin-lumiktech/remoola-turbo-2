import { loginSchema } from '../../../../../features/auth/schemas';
import {
  buildAuthMutationForwardHeaders,
  proxyAdminApiRoute,
  requireValidatedJsonBody,
} from '../../../../../lib/api-utils';

export async function POST(req: Request) {
  return proxyAdminApiRoute({
    req,
    method: `POST`,
    upstreamPath: `/admin-v2/auth/login`,
    buildHeaders(sourceHeaders) {
      const headers = buildAuthMutationForwardHeaders(sourceHeaders);
      headers.set(`content-type`, `application/json`);
      return headers;
    },
    prepareBody(request) {
      return requireValidatedJsonBody(request, loginSchema, {
        code: `VALIDATION_ERROR`,
        message: `Invalid login payload`,
      });
    },
  });
}
