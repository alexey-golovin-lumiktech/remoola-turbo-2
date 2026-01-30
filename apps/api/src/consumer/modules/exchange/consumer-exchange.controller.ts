import { Controller, Get, Post, Query, Body, Param, Patch, Delete } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerExchangeService } from './consumer-exchange.service';
import { ConvertCurrencyBody } from './dto/convert.dto';
import { CreateAutoConversionRuleBody } from './dto/create-auto-conversion-rule.dto';
import { ExchangeRateBatchBody } from './dto/rate-batch.dto';
import { ExchangeRateQuery } from './dto/rate-query.dto';
import { ScheduleConversionBody } from './dto/schedule-conversion.dto';
import { UpdateAutoConversionRuleBody } from './dto/update-auto-conversion-rule.dto';
import { Identity } from '../../../common';

@ApiTags(`Consumer Exchange`)
@ApiBearerAuth()
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

  @Post(`quote`)
  quote(@Body() body: ConvertCurrencyBody) {
    return this.service.quote(body);
  }

  @Post(`convert`)
  convert(@Identity() consumer: ConsumerModel, @Body() body: ConvertCurrencyBody) {
    return this.service.convert(consumer.id, body);
  }

  @Get(`rules`)
  listRules(@Identity() consumer: ConsumerModel) {
    return this.service.listAutoConversionRules(consumer.id);
  }

  @Post(`rules`)
  createRule(@Identity() consumer: ConsumerModel, @Body() body: CreateAutoConversionRuleBody) {
    return this.service.createAutoConversionRule(consumer.id, body);
  }

  @Patch(`rules/:ruleId`)
  updateRule(
    @Identity() consumer: ConsumerModel,
    @Param(`ruleId`) ruleId: string,
    @Body() body: UpdateAutoConversionRuleBody,
  ) {
    return this.service.updateAutoConversionRule(consumer.id, ruleId, body);
  }

  @Delete(`rules/:ruleId`)
  deleteRule(@Identity() consumer: ConsumerModel, @Param(`ruleId`) ruleId: string) {
    return this.service.deleteAutoConversionRule(consumer.id, ruleId);
  }

  @Get(`scheduled`)
  listScheduled(@Identity() consumer: ConsumerModel) {
    return this.service.listScheduledConversions(consumer.id);
  }

  @Post(`scheduled`)
  schedule(@Identity() consumer: ConsumerModel, @Body() body: ScheduleConversionBody) {
    return this.service.scheduleConversion(consumer.id, body);
  }

  @Post(`scheduled/:conversionId/cancel`)
  cancelScheduled(@Identity() consumer: ConsumerModel, @Param(`conversionId`) conversionId: string) {
    return this.service.cancelScheduledConversion(consumer.id, conversionId);
  }

  @Get(`currencies`)
  listCurrencies() {
    return this.service.getCurrencies();
  }
}
