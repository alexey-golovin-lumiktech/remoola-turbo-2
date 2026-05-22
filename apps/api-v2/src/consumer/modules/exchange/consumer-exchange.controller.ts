import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import { ConsumerExchangeService } from './consumer-exchange.service';
import { ConvertCurrencyBody } from './dto/convert.dto';
import { CreateAutoConversionRuleBody } from './dto/create-auto-conversion-rule.dto';
import { ExchangeRateBatchBody } from './dto/rate-batch.dto';
import { ExchangeRateQuery } from './dto/rate-query.dto';
import { ScheduleConversionBody } from './dto/schedule-conversion.dto';
import { UpdateAutoConversionRuleBody } from './dto/update-auto-conversion-rule.dto';
import { Identity, PagingQuery, TrackConsumerAction, type IIdentityContext } from '../../../common';

@ApiTags(`Consumer Exchange`)
@ApiCookieAuth()
@Controller(`consumer/exchange`)
export class ConsumerExchangeController {
  constructor(private readonly service: ConsumerExchangeService) {}

  @Get(`rates`)
  getRate(@Query() query: ExchangeRateQuery) {
    return this.service.getRate(query.from, query.to);
  }

  @Post(`rates/batch`)
  getRatesBatch(@Body() body: ExchangeRateBatchBody) {
    return this.service.getRatesBatch(body.pairs);
  }

  @TrackConsumerAction({ action: `consumer.exchange.quote`, resource: `exchange` })
  @Post(`quote`)
  quote(@Body() body: ConvertCurrencyBody) {
    return this.service.quote(body);
  }

  @TrackConsumerAction({ action: `consumer.exchange.convert`, resource: `exchange` })
  @Post(`convert`)
  convert(@Identity() consumer: IIdentityContext, @Body() body: ConvertCurrencyBody) {
    return this.service.convert(consumer.id, body);
  }

  @Get(`rules`)
  @ApiQuery({ name: `page`, required: false, type: Number })
  @ApiQuery({ name: `pageSize`, required: false, type: Number })
  @ApiBadRequestResponse({ description: `Invalid query parameter shape or type.` })
  listRules(@Identity() consumer: IIdentityContext, @Query() query: PagingQuery) {
    return this.service.listAutoConversionRules(consumer.id, query.page, query.pageSize);
  }

  @Post(`rules`)
  createRule(@Identity() consumer: IIdentityContext, @Body() body: CreateAutoConversionRuleBody) {
    return this.service.createAutoConversionRule(consumer.id, body);
  }

  @Patch(`rules/:ruleId`)
  @ApiParam({ name: `ruleId`, format: `uuid`, description: `Auto-conversion rule id` })
  @ApiBadRequestResponse({ description: `Invalid auto-conversion rule id.` })
  updateRule(
    @Identity() consumer: IIdentityContext,
    @Param(`ruleId`, ParseUUIDPipe) ruleId: string,
    @Body() body: UpdateAutoConversionRuleBody,
  ) {
    return this.service.updateAutoConversionRule(consumer.id, ruleId, body);
  }

  @Delete(`rules/:ruleId`)
  @ApiParam({ name: `ruleId`, format: `uuid`, description: `Auto-conversion rule id` })
  @ApiBadRequestResponse({ description: `Invalid auto-conversion rule id.` })
  deleteRule(@Identity() consumer: IIdentityContext, @Param(`ruleId`, ParseUUIDPipe) ruleId: string) {
    return this.service.deleteAutoConversionRule(consumer.id, ruleId);
  }

  @Get(`scheduled`)
  @ApiQuery({ name: `page`, required: false, type: Number })
  @ApiQuery({ name: `pageSize`, required: false, type: Number })
  @ApiBadRequestResponse({ description: `Invalid query parameter shape or type.` })
  listScheduled(@Identity() consumer: IIdentityContext, @Query() query: PagingQuery) {
    return this.service.listScheduledConversions(consumer.id, query.page, query.pageSize);
  }

  @Post(`scheduled`)
  schedule(@Identity() consumer: IIdentityContext, @Body() body: ScheduleConversionBody) {
    return this.service.scheduleConversion(consumer.id, body);
  }

  @Post(`scheduled/:conversionId/cancel`)
  @ApiParam({ name: `conversionId`, format: `uuid`, description: `Scheduled conversion id` })
  @ApiBadRequestResponse({ description: `Invalid scheduled conversion id.` })
  cancelScheduled(@Identity() consumer: IIdentityContext, @Param(`conversionId`, ParseUUIDPipe) conversionId: string) {
    return this.service.cancelScheduledConversion(consumer.id, conversionId);
  }

  @Get(`currencies`)
  listCurrencies() {
    return this.service.getCurrencies();
  }
}
