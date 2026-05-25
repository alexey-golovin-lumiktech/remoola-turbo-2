import { Controller, Get, Param, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import express from 'express';

import { Identity, type IIdentityContext } from '../../../common';
import { ConsumerContractsService } from '../../../shared/consumer-contracts/consumer-contracts.service';
import { ConsumerContractsListWithPagingQuery } from '../../../shared/consumer-contracts/dto';
import { resolveRequestBaseUrl } from '../../../shared/request-base-url';

@ApiTags(`Consumer: Contracts`)
@Controller(`consumer/contracts`)
export class ConsumerContractsController {
  constructor(private readonly service: ConsumerContractsService) {}

  @Get()
  async list(@Identity() consumer: IIdentityContext, @Query() query: ConsumerContractsListWithPagingQuery) {
    return this.service.getContracts(
      consumer.id,
      query.page,
      query.pageSize,
      query.query,
      query.status,
      query.hasDocuments,
      query.hasPayments,
      query.sort,
    );
  }

  @Get(`:id/details`)
  async details(@Identity() consumer: IIdentityContext, @Param(`id`) id: string, @Req() req: express.Request) {
    return this.service.getDetails(id, consumer.id, resolveRequestBaseUrl(req));
  }
}
