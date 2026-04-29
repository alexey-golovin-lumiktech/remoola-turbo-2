import { Controller, Get, Post, Query, Body, Param, Patch, Delete } from '@nestjs/common';
import { ApiCookieAuth, ApiTags } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsNumber, IsOptional, Min } from 'class-validator';

import { ConsumerExchangeService } from './consumer-exchange.service';
import { ConvertCurrencyBody } from './dto/convert.dto';
import { CreateAutoConversionRuleBody } from './dto/create-auto-conversion-rule.dto';
import { ExchangeRateBatchBody } from './dto/rate-batch.dto';
import { ExchangeRateQuery } from './dto/rate-query.dto';
import { ScheduleConversionBody } from './dto/schedule-conversion.dto';
import { UpdateAutoConversionRuleBody } from './dto/update-auto-conversion-rule.dto';
import { Identity, TrackConsumerAction, type IIdentityContext } from '../../../common';

class ConsumerExchangePaginationQuery {
  @Expose()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  page?: number;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  pageSize?: number;
}

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
  listRules(@Identity() consumer: IIdentityContext, @Query() query: ConsumerExchangePaginationQuery) {
    return this.service.listAutoConversionRules(consumer.id, query.page, query.pageSize);
  }

  @Post(`rules`)
  createRule(@Identity() consumer: IIdentityContext, @Body() body: CreateAutoConversionRuleBody) {
    return this.service.createAutoConversionRule(consumer.id, body);
  }

  @Patch(`rules/:ruleId`)
  updateRule(
    @Identity() consumer: IIdentityContext,
    @Param(`ruleId`) ruleId: string,
    @Body() body: UpdateAutoConversionRuleBody,
  ) {
    return this.service.updateAutoConversionRule(consumer.id, ruleId, body);
  }

  @Delete(`rules/:ruleId`)
  deleteRule(@Identity() consumer: IIdentityContext, @Param(`ruleId`) ruleId: string) {
    return this.service.deleteAutoConversionRule(consumer.id, ruleId);
  }

  @Get(`scheduled`)
  listScheduled(@Identity() consumer: IIdentityContext, @Query() query: ConsumerExchangePaginationQuery) {
    return this.service.listScheduledConversions(consumer.id, query.page, query.pageSize);
  }

  @Post(`scheduled`)
  schedule(@Identity() consumer: IIdentityContext, @Body() body: ScheduleConversionBody) {
    return this.service.scheduleConversion(consumer.id, body);
  }

  @Post(`scheduled/:conversionId/cancel`)
  cancelScheduled(@Identity() consumer: IIdentityContext, @Param(`conversionId`) conversionId: string) {
    return this.service.cancelScheduledConversion(consumer.id, conversionId);
  }

  @Get(`currencies`)
  listCurrencies() {
    return this.service.getCurrencies();
  }
}
