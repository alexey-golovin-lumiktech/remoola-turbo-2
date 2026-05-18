import { Injectable } from '@nestjs/common';

import { $Enums } from '@remoola/database-2';

import { ConsumerAutoConversionRuleService } from './consumer-auto-conversion-rule.service';
import { ConsumerCurrencyConversionService } from './consumer-currency-conversion.service';
import { ConsumerExchangeRateService } from './consumer-exchange-rate.service';
import { ConsumerScheduledConversionService } from './consumer-scheduled-conversion.service';
import { ConvertCurrencyBody } from './dto/convert.dto';
import { CreateAutoConversionRuleBody } from './dto/create-auto-conversion-rule.dto';
import { ScheduleConversionBody } from './dto/schedule-conversion.dto';
import { UpdateAutoConversionRuleBody } from './dto/update-auto-conversion-rule.dto';
import { BalanceCalculationService } from '../../../shared/balance-calculation.service';

@Injectable()
export class ConsumerExchangeService {
  constructor(
    private readonly balanceService: BalanceCalculationService,
    private readonly rateService: ConsumerExchangeRateService,
    private readonly conversionService: ConsumerCurrencyConversionService,
    private readonly scheduledConversionService: ConsumerScheduledConversionService,
    private readonly autoConversionRuleService: ConsumerAutoConversionRuleService,
  ) {}

  async getRate(from: $Enums.CurrencyCode, to: $Enums.CurrencyCode) {
    return this.rateService.getRate(from, to);
  }

  async getBalanceByCurrency(consumerId: string): Promise<Record<$Enums.CurrencyCode, number>> {
    const result = await this.balanceService.calculateMultiCurrency(consumerId);
    return result.balances;
  }

  async convert(consumerId: string, body: ConvertCurrencyBody) {
    return this.conversionService.convert(consumerId, body);
  }

  async quote(body: ConvertCurrencyBody) {
    return this.rateService.quote(body);
  }

  async getRatesBatch(pairs: { from: $Enums.CurrencyCode; to: $Enums.CurrencyCode }[]) {
    return this.rateService.getRatesBatch(pairs);
  }

  async listAutoConversionRules(consumerId: string, page = 1, pageSize = 10) {
    return this.autoConversionRuleService.listAutoConversionRules(consumerId, page, pageSize);
  }

  async createAutoConversionRule(consumerId: string, body: CreateAutoConversionRuleBody) {
    return this.autoConversionRuleService.createAutoConversionRule(consumerId, body);
  }

  async updateAutoConversionRule(consumerId: string, ruleId: string, body: UpdateAutoConversionRuleBody) {
    return this.autoConversionRuleService.updateAutoConversionRule(consumerId, ruleId, body);
  }

  async deleteAutoConversionRule(consumerId: string, ruleId: string) {
    return this.autoConversionRuleService.deleteAutoConversionRule(consumerId, ruleId);
  }

  async listScheduledConversions(consumerId: string, page = 1, pageSize = 10) {
    return this.scheduledConversionService.listScheduledConversions(consumerId, page, pageSize);
  }

  async scheduleConversion(consumerId: string, body: ScheduleConversionBody) {
    return this.scheduledConversionService.scheduleConversion(consumerId, body);
  }

  async cancelScheduledConversion(consumerId: string, conversionId: string) {
    return this.scheduledConversionService.cancelScheduledConversion(consumerId, conversionId);
  }

  async processDueScheduledConversions() {
    return this.scheduledConversionService.processDueScheduledConversions();
  }

  async executeScheduledConversionNow(conversionId: string, initiatedBy?: { source: string; actorId?: string }) {
    return this.scheduledConversionService.executeScheduledConversionNow(conversionId, initiatedBy);
  }

  async processDueAutoConversionRules() {
    return this.autoConversionRuleService.processDueAutoConversionRules();
  }

  async runAutoConversionRuleNow(ruleId: string, initiatedBy?: { source: string; actorId?: string }) {
    return this.autoConversionRuleService.runAutoConversionRuleNow(ruleId, initiatedBy);
  }

  getCurrencies() {
    return this.rateService.getCurrencies();
  }
}
