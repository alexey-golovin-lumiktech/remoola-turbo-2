import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';

import { ConsumerExchangeService } from './consumer-exchange.service';

@Injectable()
export class ConsumerExchangeScheduler {
  constructor(private readonly exchangeService: ConsumerExchangeService) {}

  @Cron(`*/1 * * * *`)
  async processScheduledConversions() {
    await this.exchangeService.processDueScheduledConversions();
  }

  @Cron(`*/5 * * * *`)
  async processAutoConversionRules() {
    await this.exchangeService.processDueAutoConversionRules();
  }
}
