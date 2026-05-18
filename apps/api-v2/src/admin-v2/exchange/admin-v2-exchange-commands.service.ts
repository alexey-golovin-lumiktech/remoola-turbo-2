import { Injectable } from '@nestjs/common';

import { AdminExchangeRateApprovalService } from './admin-exchange-rate-approval.service';
import { AdminExchangeRuleCommandsService } from './admin-exchange-rule-commands.service';
import { AdminScheduledConversionCommandsService } from './admin-scheduled-conversion-commands.service';
import { type AdminV2RequestMeta as RequestMeta } from '../admin-v2-context.types';

@Injectable()
export class AdminV2ExchangeCommandsService {
  constructor(
    private readonly rateApprovalService: AdminExchangeRateApprovalService,
    private readonly scheduledCommandsService: AdminScheduledConversionCommandsService,
    private readonly ruleCommandsService: AdminExchangeRuleCommandsService,
  ) {}

  async approveRate(
    rateId: string,
    adminId: string,
    body: { confirmed?: boolean; version?: number; reason?: string | null },
    meta: RequestMeta,
  ) {
    return this.rateApprovalService.approveRate(rateId, adminId, body, meta);
  }

  async pauseRule(ruleId: string, adminId: string, body: { version?: number }, meta: RequestMeta) {
    return this.ruleCommandsService.pauseRule(ruleId, adminId, body, meta);
  }

  async resumeRule(ruleId: string, adminId: string, body: { version?: number }, meta: RequestMeta) {
    return this.ruleCommandsService.resumeRule(ruleId, adminId, body, meta);
  }

  async runRuleNow(ruleId: string, adminId: string, body: { version?: number }, meta: RequestMeta) {
    return this.ruleCommandsService.runRuleNow(ruleId, adminId, body, meta);
  }

  async forceExecuteScheduledConversion(
    conversionId: string,
    adminId: string,
    body: { confirmed?: boolean; version?: number },
    meta: RequestMeta,
  ) {
    return this.scheduledCommandsService.forceExecuteScheduledConversion(conversionId, adminId, body, meta);
  }

  async cancelScheduledConversion(
    conversionId: string,
    adminId: string,
    body: { confirmed?: boolean; version?: number },
    meta: RequestMeta,
  ) {
    return this.scheduledCommandsService.cancelScheduledConversion(conversionId, adminId, body, meta);
  }
}
