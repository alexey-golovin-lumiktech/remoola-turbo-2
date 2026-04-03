import { getConsumerMobileCsrfTokenCookieKey } from '@remoola/api-types';

/**
 * Shared constants for tests. Matches consumer-mobile dev port (see package.json "dev" script).
 */
export const TEST_APP_ORIGIN = `http://localhost:3002`;

export const TEST_CSRF_COOKIE_KEY = getConsumerMobileCsrfTokenCookieKey({
  isProduction: false,
  isVercel: false,
  cookieSecure: false,
  isSecureRequest: false,
});
