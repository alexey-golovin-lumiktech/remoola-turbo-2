import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBasicAuth, ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { type AdminModel } from '@remoola/database-2';

import { AdminExchangeService } from './admin-exchange.service';
import { AdminExchangeRulesListQuery, AdminExchangeScheduledListQuery, ExchangeRateListQuery } from './dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';
import { UpdateAutoConversionRuleBody } from '../../../consumer/modules/exchange/dto/update-auto-conversion-rule.dto';
import { ExchangeRateCreate, ExchangeRateUpdate } from '../../../dtos/admin/exchange-rate.dto';

function one(v: string | string[] | undefined): string | undefined {
  return (typeof v === `string` ? v : v?.[0])?.trim() || undefined;
}

function parseExchangeRulesListQuery(dto: AdminExchangeRulesListQuery) {
  const pageRaw = one(dto.page as string | string[] | undefined);
  const pageSizeRaw = one(dto.pageSize as string | string[] | undefined);
  const pageNum = pageRaw != null && Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : undefined;
  const pageSizeNum = pageSizeRaw != null && Number.isFinite(Number(pageSizeRaw)) ? Number(pageSizeRaw) : undefined;
  return {
    q: one(dto.q as string | string[] | undefined),
    enabled: one(dto.enabled as string | string[] | undefined),
    page: pageNum,
    pageSize: pageSizeNum,
    includeDeleted: one(dto.includeDeleted as string | string[] | undefined) === `true`,
  };
}

function parseExchangeScheduledListQuery(dto: AdminExchangeScheduledListQuery) {
  const pageRaw = one(dto.page as string | string[] | undefined);
  const pageSizeRaw = one(dto.pageSize as string | string[] | undefined);
  const pageNum = pageRaw != null && Number.isFinite(Number(pageRaw)) ? Number(pageRaw) : undefined;
  const pageSizeNum = pageSizeRaw != null && Number.isFinite(Number(pageSizeRaw)) ? Number(pageSizeRaw) : undefined;
  return {
    q: one(dto.q as string | string[] | undefined),
    status: one(dto.status as string | string[] | undefined),
    page: pageNum,
    pageSize: pageSizeNum,
    includeDeleted: one(dto.includeDeleted as string | string[] | undefined) === `true`,
  };
}

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
      includeDeleted: query.includeDeleted === `true`,
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
  listRules(@Query() query: AdminExchangeRulesListQuery) {
    return this.service.listRules(parseExchangeRulesListQuery(query));
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
  listScheduled(@Query() query: AdminExchangeScheduledListQuery) {
    return this.service.listScheduledConversions(parseExchangeScheduledListQuery(query));
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
