import { Injectable } from '@nestjs/common';

import { AdminV2ExchangeCommandsService } from './admin-v2-exchange-commands.service';
import { AdminV2ExchangeQueriesService } from './admin-v2-exchange-queries.service';

type RequestMeta = {
  ipAddress?: string | null;
  userAgent?: string | null;
  idempotencyKey?: string | null;
};

@Injectable()
export class AdminV2ExchangeService {
  constructor(
    private readonly commandsService: AdminV2ExchangeCommandsService,
    private readonly queriesService: AdminV2ExchangeQueriesService,
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
    return this.queriesService.listRates(params);
  }

  async getRateCase(rateId: string) {
    return this.queriesService.getRateCase(rateId);
  }

  async approveRate(
    rateId: string,
    adminId: string,
    body: { confirmed?: boolean; version?: number; reason?: string | null },
    meta: RequestMeta,
  ) {
    return this.commandsService.approveRate(rateId, adminId, body, meta);
  }

  async listRules(params?: {
    page?: number;
    pageSize?: number;
    q?: string;
    enabled?: boolean;
    fromCurrency?: string;
    toCurrency?: string;
  }) {
    return this.queriesService.listRules(params);
  }

  async getRuleCase(ruleId: string) {
    return this.queriesService.getRuleCase(ruleId);
  }

  async pauseRule(ruleId: string, adminId: string, body: { version?: number }, meta: RequestMeta) {
    return this.commandsService.pauseRule(ruleId, adminId, body, meta);
  }

  async resumeRule(ruleId: string, adminId: string, body: { version?: number }, meta: RequestMeta) {
    return this.commandsService.resumeRule(ruleId, adminId, body, meta);
  }

  async runRuleNow(ruleId: string, adminId: string, body: { version?: number }, meta: RequestMeta) {
    return this.commandsService.runRuleNow(ruleId, adminId, body, meta);
  }

  async listScheduledConversions(params?: { page?: number; pageSize?: number; q?: string; status?: string }) {
    return this.queriesService.listScheduledConversions(params);
  }

  async getScheduledConversionCase(conversionId: string) {
    return this.queriesService.getScheduledConversionCase(conversionId);
  }

  async forceExecuteScheduledConversion(
    conversionId: string,
    adminId: string,
    body: { confirmed?: boolean; version?: number },
    meta: RequestMeta,
  ) {
    return this.commandsService.forceExecuteScheduledConversion(conversionId, adminId, body, meta);
  }

  async cancelScheduledConversion(
    conversionId: string,
    adminId: string,
    body: { confirmed?: boolean; version?: number },
    meta: RequestMeta,
  ) {
    return this.commandsService.cancelScheduledConversion(conversionId, adminId, body, meta);
  }
}
