import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { ConsumerExchangeService } from './consumer-exchange.service';

@Injectable()
export class ConsumerExchangeScheduler {
  private readonly logger = new Logger(ConsumerExchangeScheduler.name);
  private scheduledConversionConsecutiveFailures = 0;
  private autoRuleConsecutiveFailures = 0;

  constructor(private readonly exchangeService: ConsumerExchangeService) {}

  @Cron(`*/1 * * * *`)
  async processScheduledConversions() {
    try {
      await this.exchangeService.processDueScheduledConversions();
      this.scheduledConversionConsecutiveFailures = 0;
      this.logger.log({ event: `exchange_scheduled_conversions_complete` });
    } catch (err) {
      this.scheduledConversionConsecutiveFailures += 1;
      this.logger.warn({
        event: `exchange_scheduled_conversions_failed`,
        consecutiveFailures: this.scheduledConversionConsecutiveFailures,
        errorClass: err instanceof Error ? err.name : `UnknownError`,
        message: err instanceof Error ? err.message : `Unknown`,
      });
      if (this.scheduledConversionConsecutiveFailures >= 3) {
        this.logger.error({
          event: `exchange_scheduled_conversions_degraded`,
          consecutiveFailures: this.scheduledConversionConsecutiveFailures,
        });
      }
    }
  }

  @Cron(`*/5 * * * *`)
  async processAutoConversionRules() {
    try {
      await this.exchangeService.processDueAutoConversionRules();
      this.autoRuleConsecutiveFailures = 0;
      this.logger.log({ event: `exchange_auto_conversion_rules_complete` });
    } catch (err) {
      this.autoRuleConsecutiveFailures += 1;
      this.logger.warn({
        event: `exchange_auto_conversion_rules_failed`,
        consecutiveFailures: this.autoRuleConsecutiveFailures,
        errorClass: err instanceof Error ? err.name : `UnknownError`,
        message: err instanceof Error ? err.message : `Unknown`,
      });
      if (this.autoRuleConsecutiveFailures >= 3) {
        this.logger.error({
          event: `exchange_auto_conversion_rules_degraded`,
          consecutiveFailures: this.autoRuleConsecutiveFailures,
        });
      }
    }
  }
}
