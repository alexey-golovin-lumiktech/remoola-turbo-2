import { isConsumerAppScope, type ConsumerAppScope } from '../http/auth-cookie-policy';

export const CONSUMER_APP_SCOPE_HEADER = `x-remoola-app-scope` as const;

export function parseConsumerAppScopeHeader(value: string | null | undefined): ConsumerAppScope | undefined {
  return isConsumerAppScope(value) ? value : undefined;
}
