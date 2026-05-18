import { Inject, Injectable } from '@nestjs/common';

export const CONSUMER_ACTION_LOG_CRITICAL_ACTION_PREFIXES = Symbol(`CONSUMER_ACTION_LOG_CRITICAL_ACTION_PREFIXES`);

export const DEFAULT_CONSUMER_ACTION_LOG_CRITICAL_ACTION_PREFIXES = [
  `consumer.payments.withdraw`,
  `consumer.payments.transfer`,
  `consumer.exchange.convert`,
] as const;

@Injectable()
export class ConsumerActionLogPolicyService {
  constructor(
    @Inject(CONSUMER_ACTION_LOG_CRITICAL_ACTION_PREFIXES)
    private readonly criticalActionPrefixes: readonly string[],
  ) {}

  isCriticalAction(action: string): boolean {
    return this.criticalActionPrefixes.some((prefix) => action.startsWith(prefix));
  }
}
