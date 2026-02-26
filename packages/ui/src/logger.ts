/**
 * Client-side logger. In development logs to console; in production no-ops
 * to avoid noisy console and PII leakage. Can be extended with an error-reporting
 * callback (e.g. Sentry) later.
 */

const isDev = typeof process !== `undefined` && process.env?.NODE_ENV === `development`;

function createClientLogger(scope: string) {
  const prefix = `[${scope}]`;
  return {
    warn(message: string, context?: Record<string, unknown>): void {
      if (isDev) {
        if (context != null) {
          console.warn(`${prefix} ${message}`, context);
        } else {
          console.warn(`${prefix} ${message}`);
        }
      }
    },
    error(message: string, context?: Record<string, unknown>): void {
      if (isDev) {
        if (context != null) {
          console.error(`${prefix} ${message}`, context);
        } else {
          console.error(`${prefix} ${message}`);
        }
      }
      // In production: optionally call reportError?.(message, context) for RUM/analytics
    },
    info(message: string, context?: Record<string, unknown>): void {
      if (isDev) {
        if (context != null) {
          console.log(`${prefix} ${message}`, context);
        } else {
          console.log(`${prefix} ${message}`);
        }
      }
    },
  };
}

export { createClientLogger };
