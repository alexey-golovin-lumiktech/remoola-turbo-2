import { Body, Controller, Delete, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBadRequestResponse, ApiCookieAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

import {
  consumerCancelledScheduledConversionResponseSchema,
  consumerDeletedExchangeRuleResponseSchema,
  consumerExchangeCurrenciesResponseSchema,
  consumerExchangeConversionResponseSchema,
  consumerExchangeQuoteResponseSchema,
  consumerExchangeRateSchema,
  consumerExchangeRatesBatchResponseSchema,
  consumerExchangeRuleSchema,
  consumerExchangeRulesResponseSchema,
  consumerScheduledConversionSchema,
  consumerScheduledConversionsResponseSchema,
  type ConsumerCancelledScheduledConversionResponse,
  type ConsumerDeletedExchangeRuleResponse,
  type ConsumerExchangeCurrenciesResponse,
  type ConsumerExchangeConversionResponse,
  type ConsumerExchangeQuoteResponse,
  type ConsumerExchangeRate,
  type ConsumerExchangeRatesBatchResponse,
  type ConsumerExchangeRulesResponse,
  type ConsumerScheduledConversionsResponse,
} from '@remoola/api-types';

import { ConsumerExchangeService } from './consumer-exchange.service';
import { ConvertCurrencyBody } from './dto/convert.dto';
import { CreateAutoConversionRuleBody } from './dto/create-auto-conversion-rule.dto';
import { ExchangeRateBatchBody } from './dto/rate-batch.dto';
import { ExchangeRateQuery } from './dto/rate-query.dto';
import { ScheduleConversionBody } from './dto/schedule-conversion.dto';
import { UpdateAutoConversionRuleBody } from './dto/update-auto-conversion-rule.dto';
import { Identity, PagingQuery, TrackConsumerAction, type IIdentityContext } from '../../../common';
import { toConsumerWireContract } from '../../consumer-wire-contract';

@ApiTags(`Consumer Exchange`)
@ApiCookieAuth()
@Controller(`consumer/exchange`)
export class ConsumerExchangeController {
  constructor(private readonly service: ConsumerExchangeService) {}

  @Get(`rates`)
  async getRate(@Query() query: ExchangeRateQuery): Promise<ConsumerExchangeRate> {
    return toConsumerWireContract(consumerExchangeRateSchema, await this.service.getRate(query.from, query.to));
  }

  @Post(`rates/batch`)
  async getRatesBatch(@Body() body: ExchangeRateBatchBody): Promise<ConsumerExchangeRatesBatchResponse> {
    return toConsumerWireContract(
      consumerExchangeRatesBatchResponseSchema,
      await this.service.getRatesBatch(body.pairs),
    );
  }

  @TrackConsumerAction({ action: `consumer.exchange.quote`, resource: `exchange` })
  @Post(`quote`)
  async quote(@Body() body: ConvertCurrencyBody): Promise<ConsumerExchangeQuoteResponse> {
    return toConsumerWireContract(consumerExchangeQuoteResponseSchema, await this.service.quote(body));
  }

  @TrackConsumerAction({ action: `consumer.exchange.convert`, resource: `exchange` })
  @Post(`convert`)
  async convert(
    @Identity() consumer: IIdentityContext,
    @Body() body: ConvertCurrencyBody,
  ): Promise<ConsumerExchangeConversionResponse> {
    return toConsumerWireContract(
      consumerExchangeConversionResponseSchema,
      await this.service.convert(consumer.id, body),
    );
  }

  @Get(`rules`)
  @ApiQuery({ name: `page`, required: false, type: Number })
  @ApiQuery({ name: `pageSize`, required: false, type: Number })
  @ApiBadRequestResponse({ description: `Invalid query parameter shape or type.` })
  async listRules(
    @Identity() consumer: IIdentityContext,
    @Query() query: PagingQuery,
  ): Promise<ConsumerExchangeRulesResponse> {
    return toConsumerWireContract(
      consumerExchangeRulesResponseSchema,
      await this.service.listAutoConversionRules(consumer.id, query.page, query.pageSize),
    );
  }

  @Post(`rules`)
  async createRule(@Identity() consumer: IIdentityContext, @Body() body: CreateAutoConversionRuleBody) {
    return toConsumerWireContract(
      consumerExchangeRuleSchema,
      await this.service.createAutoConversionRule(consumer.id, body),
    );
  }

  @Patch(`rules/:ruleId`)
  @ApiParam({ name: `ruleId`, format: `uuid`, description: `Auto-conversion rule id` })
  @ApiBadRequestResponse({ description: `Invalid auto-conversion rule id.` })
  updateRule(
    @Identity() consumer: IIdentityContext,
    @Param(`ruleId`, ParseUUIDPipe) ruleId: string,
    @Body() body: UpdateAutoConversionRuleBody,
  ) {
    return this.service
      .updateAutoConversionRule(consumer.id, ruleId, body)
      .then((result) => toConsumerWireContract(consumerExchangeRuleSchema, result));
  }

  @Delete(`rules/:ruleId`)
  @ApiParam({ name: `ruleId`, format: `uuid`, description: `Auto-conversion rule id` })
  @ApiBadRequestResponse({ description: `Invalid auto-conversion rule id.` })
  async deleteRule(
    @Identity() consumer: IIdentityContext,
    @Param(`ruleId`, ParseUUIDPipe) ruleId: string,
  ): Promise<ConsumerDeletedExchangeRuleResponse> {
    return toConsumerWireContract(
      consumerDeletedExchangeRuleResponseSchema,
      await this.service.deleteAutoConversionRule(consumer.id, ruleId),
    );
  }

  @Get(`scheduled`)
  @ApiQuery({ name: `page`, required: false, type: Number })
  @ApiQuery({ name: `pageSize`, required: false, type: Number })
  @ApiBadRequestResponse({ description: `Invalid query parameter shape or type.` })
  async listScheduled(
    @Identity() consumer: IIdentityContext,
    @Query() query: PagingQuery,
  ): Promise<ConsumerScheduledConversionsResponse> {
    return toConsumerWireContract(
      consumerScheduledConversionsResponseSchema,
      await this.service.listScheduledConversions(consumer.id, query.page, query.pageSize),
    );
  }

  @Post(`scheduled`)
  async schedule(@Identity() consumer: IIdentityContext, @Body() body: ScheduleConversionBody) {
    return toConsumerWireContract(
      consumerScheduledConversionSchema,
      await this.service.scheduleConversion(consumer.id, body),
    );
  }

  @Post(`scheduled/:conversionId/cancel`)
  @ApiParam({ name: `conversionId`, format: `uuid`, description: `Scheduled conversion id` })
  @ApiBadRequestResponse({ description: `Invalid scheduled conversion id.` })
  async cancelScheduled(
    @Identity() consumer: IIdentityContext,
    @Param(`conversionId`, ParseUUIDPipe) conversionId: string,
  ): Promise<ConsumerCancelledScheduledConversionResponse> {
    return toConsumerWireContract(
      consumerCancelledScheduledConversionResponseSchema,
      await this.service.cancelScheduledConversion(consumer.id, conversionId),
    );
  }

  @Get(`currencies`)
  async listCurrencies(): Promise<ConsumerExchangeCurrenciesResponse> {
    return toConsumerWireContract(consumerExchangeCurrenciesResponseSchema, this.service.getCurrencies());
  }
}
