import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBasicAuth, ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { type AdminModel } from '@remoola/database-2';

import { AdminExchangeService } from './admin-exchange.service';
import { ExchangeRateListQuery } from './dto/exchange-rate-query.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';
import { UpdateAutoConversionRuleBody } from '../../../consumer/modules/exchange/dto/update-auto-conversion-rule.dto';
import { ExchangeRateCreate, ExchangeRateUpdate } from '../../../dtos/admin/exchange-rate.dto';

@UseGuards(JwtAuthGuard)
@ApiTags(`Admin: Exchange`)
@ApiBearerAuth(`bearer`)
@ApiBasicAuth(`basic`)
@Controller(`admin/exchange`)
export class AdminExchangeController {
  constructor(private readonly service: AdminExchangeService) {}

  @Get(`rates`)
  listRates(@Query() query: ExchangeRateListQuery) {
    const pageNum = query.page != null && Number.isFinite(Number(query.page)) ? Number(query.page) : undefined;
    const pageSizeNum =
      query.pageSize != null && Number.isFinite(Number(query.pageSize)) ? Number(query.pageSize) : undefined;
    return this.service.listRates({
      ...query,
      page: pageNum,
      pageSize: pageSizeNum,
    });
  }

  @Get(`rates/:rateId`)
  getRate(@Param(`rateId`) rateId: string) {
    return this.service.getRateById(rateId);
  }

  @Post(`rates`)
  createRate(@Identity() admin: AdminModel, @Body() body: ExchangeRateCreate) {
    return this.service.createRate(body, admin.id);
  }

  @Patch(`rates/:rateId`)
  updateRate(@Identity() admin: AdminModel, @Param(`rateId`) rateId: string, @Body() body: ExchangeRateUpdate) {
    return this.service.updateRate(rateId, body, admin.id);
  }

  @Delete(`rates/:rateId`)
  deleteRate(@Identity() admin: AdminModel, @Param(`rateId`) rateId: string) {
    return this.service.deleteRate(rateId, admin.id);
  }

  @Get(`currencies`)
  listCurrencies() {
    return this.service.listCurrencies();
  }

  @Get(`rules`)
  listRules(@Query(`q`) q?: string, @Query(`enabled`) enabled?: string) {
    return this.service.listRules({
      q: q?.trim() || undefined,
      enabled: enabled?.trim() || undefined,
    });
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
  listScheduled(@Query(`q`) q?: string, @Query(`status`) status?: string) {
    return this.service.listScheduledConversions({
      q: q?.trim() || undefined,
      status: status?.trim() || undefined,
    });
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
