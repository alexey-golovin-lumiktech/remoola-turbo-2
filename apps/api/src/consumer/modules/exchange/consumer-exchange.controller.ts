import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

import { ConsumerModel } from '@remoola/database-2';

import { ConsumerExchangeService } from './consumer-exchange.service';
import { ConvertCurrencyDto } from './dto/convert.dto';
import { ExchangeRateQueryDto } from './dto/rate-query.dto';
import { Identity } from '../../../common';

@ApiTags(`Consumer Exchange`)
@ApiBearerAuth()
@Controller(`consumer/exchange`)
export class ConsumerExchangeController {
  constructor(private readonly service: ConsumerExchangeService) {}

  @Get(`rates`)
  getRate(@Query() query: ExchangeRateQueryDto) {
    return this.service.getRate(query.from, query.to);
  }

  @Post(`convert`)
  convert(@Identity() consumer: ConsumerModel, @Body() dto: ConvertCurrencyDto) {
    return this.service.convert(consumer.id, dto);
  }
}
