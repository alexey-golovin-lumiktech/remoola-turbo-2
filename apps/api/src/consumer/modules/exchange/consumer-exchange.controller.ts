import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerExchangeService } from './consumer-exchange.service';
import { ConvertCurrencyBody } from './dto/convert.dto';
import { ExchangeRateQuery } from './dto/rate-query.dto';
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

  @Post(`convert`)
  convert(@Identity() consumer: ConsumerModel, @Body() body: ConvertCurrencyBody) {
    return this.service.convert(consumer.id, body);
  }
}
