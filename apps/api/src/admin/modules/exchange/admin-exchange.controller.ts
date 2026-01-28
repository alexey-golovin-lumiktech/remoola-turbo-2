import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBasicAuth, ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { type AdminModel } from '@remoola/database-2';

import { UpdateAutoConversionRuleBody } from '../../../consumer/modules/exchange/dto/update-auto-conversion-rule.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';
import { AdminExchangeService } from './admin-exchange.service';

@UseGuards(JwtAuthGuard)
@ApiTags(`Admin: Exchange`)
@ApiBearerAuth(`bearer`)
@ApiBasicAuth(`basic`)
@Controller(`admin/exchange`)
export class AdminExchangeController {
  constructor(private readonly service: AdminExchangeService) {}

  @Get(`rules`)
  listRules() {
    return this.service.listRules();
  }

  @Patch(`rules/:ruleId`)
  updateRule(@Param(`ruleId`) ruleId: string, @Body() body: UpdateAutoConversionRuleBody) {
    return this.service.updateRule(ruleId, body);
  }

  @Post(`rules/:ruleId/run`)
  runRule(@Identity() admin: AdminModel, @Param(`ruleId`) ruleId: string) {
    return this.service.runRuleNow(ruleId, admin.id);
  }

  @Get(`scheduled`)
  listScheduled() {
    return this.service.listScheduledConversions();
  }

  @Post(`scheduled/:conversionId/cancel`)
  cancelScheduled(@Param(`conversionId`) conversionId: string) {
    return this.service.cancelScheduledConversion(conversionId);
  }

  @Post(`scheduled/:conversionId/execute`)
  executeScheduled(@Identity() admin: AdminModel, @Param(`conversionId`) conversionId: string) {
    return this.service.executeScheduledConversion(conversionId, admin.id);
  }
}
