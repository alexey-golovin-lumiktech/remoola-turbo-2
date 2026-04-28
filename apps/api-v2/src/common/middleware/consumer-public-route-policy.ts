export type ConsumerPublicRoutePolicy = `external-public` | `bff-only-public` | `not-public`;

const COMPLETE_PROFILE_CREATION_ROUTE = `/api/consumer/auth/signup/:consumerId/complete-profile-creation`;
const COMPLETE_PROFILE_CREATION_ROUTE_REGEX = /^\/api\/consumer\/auth\/signup\/[^/]+\/complete-profile-creation$/;

const EXTERNAL_PUBLIC_CONSUMER_ROUTES = new Set([
  `GET /api/consumer/auth/google/start`,
  `GET /api/consumer/auth/google/callback`,
  `GET /api/consumer/auth/forgot-password/verify`,
  `GET /api/consumer/auth/signup/verification`,
  `POST /api/consumer/webhooks`,
  `POST /api/consumer/webhook`,
]);

const BFF_ONLY_PUBLIC_CONSUMER_ROUTES = new Set([
  `POST /api/consumer/auth/login`,
  `GET /api/consumer/auth/google/signup-session`,
  `POST /api/consumer/auth/google/signup-session/establish`,
  `POST /api/consumer/auth/oauth/complete`,
  `POST /api/consumer/auth/logout`,
  `POST /api/consumer/auth/refresh`,
  `POST /api/consumer/auth/signup`,
  `GET ${COMPLETE_PROFILE_CREATION_ROUTE}`,
  `POST /api/consumer/auth/forgot-password`,
  `POST /api/consumer/auth/password/reset`,
]);

function normalizeConsumerRoutePath(path: string): string {
  if (COMPLETE_PROFILE_CREATION_ROUTE_REGEX.test(path)) {
    return COMPLETE_PROFILE_CREATION_ROUTE;
  }

  return path;
}

// Public auth metadata only means "no auth token required".
// Transport rules (external-public vs BFF-only with appScope header) are enforced separately here.
function getConsumerPublicRoutePolicy(method?: string, path?: string): ConsumerPublicRoutePolicy {
  if (typeof method !== `string` || typeof path !== `string`) {
    return `not-public`;
  }

  const routeKey = `${method.toUpperCase()} ${normalizeConsumerRoutePath(path)}`;

  if (EXTERNAL_PUBLIC_CONSUMER_ROUTES.has(routeKey)) {
    return `external-public`;
  }

  if (BFF_ONLY_PUBLIC_CONSUMER_ROUTES.has(routeKey)) {
    return `bff-only-public`;
  }

  return `not-public`;
}

export function isExternalPublicConsumerRoute(method?: string, path?: string): boolean {
  return getConsumerPublicRoutePolicy(method, path) === `external-public`;
}
