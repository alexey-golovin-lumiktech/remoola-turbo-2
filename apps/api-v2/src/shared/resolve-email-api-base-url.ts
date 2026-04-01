import { envs } from '../envs';

const NEST_ORIGIN_PLACEHOLDER = `NEST_APP_EXTERNAL_ORIGIN`;

/**
 * Base URL for API links in outbound email (e.g. signup verify, forgot-password).
 * Production/staging require `NEST_APP_EXTERNAL_ORIGIN`; dev/test may fall back to local API.
 */
export function resolveEmailApiBaseUrl(): string {
  const configured = envs.NEST_APP_EXTERNAL_ORIGIN;
  if (configured && configured !== NEST_ORIGIN_PLACEHOLDER) {
    const base = configured.replace(/\/api\/?$/, ``);
    return `${base}/api`;
  }
  if (envs.NODE_ENV === envs.ENVIRONMENT.DEVELOPMENT || envs.NODE_ENV === envs.ENVIRONMENT.TEST) {
    return new URL(`/api`, `http://127.0.0.1:${envs.PORT}`).toString().replace(/\/$/, ``);
  }
  throw new Error(`NEST_APP_EXTERNAL_ORIGIN must be configured for email URL generation (NODE_ENV=${envs.NODE_ENV})`);
}
