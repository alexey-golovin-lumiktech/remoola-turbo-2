import { Injectable } from '@nestjs/common';

import { AdminExchangeRateQueriesService } from './admin-exchange-rate-queries.service';
import { AdminExchangeRuleQueriesService } from './admin-exchange-rule-queries.service';
import { AdminExchangeScheduledConversionQueriesService } from './admin-exchange-scheduled-conversion-queries.service';

@Injectable()
export class AdminV2ExchangeQueriesService {
  constructor(
    private readonly rateQueries: AdminExchangeRateQueriesService,
    private readonly ruleQueries: AdminExchangeRuleQueriesService,
    private readonly scheduledConversionQueries: AdminExchangeScheduledConversionQueriesService,
  ) {}

  async listRates(params?: {
    page?: number;
    pageSize?: number;
    fromCurrency?: string;
    toCurrency?: string;
    provider?: string;
    status?: string;
    stale?: boolean;
  }) {
    return this.rateQueries.listRates(params);
  }

  async getRateCase(rateId: string) {
    return this.rateQueries.getRateCase(rateId);
  }

  async listRules(params?: {
    page?: number;
    pageSize?: number;
    q?: string;
    enabled?: boolean;
    fromCurrency?: string;
    toCurrency?: string;
  }) {
    return this.ruleQueries.listRules(params);
  }

  async getRuleCase(ruleId: string) {
    return this.ruleQueries.getRuleCase(ruleId);
  }

  async listScheduledConversions(params?: { page?: number; pageSize?: number; q?: string; status?: string }) {
    return this.scheduledConversionQueries.listScheduledConversions(params);
  }

  async getScheduledConversionCase(conversionId: string) {
    return this.scheduledConversionQueries.getScheduledConversionCase(conversionId);
  }
}
