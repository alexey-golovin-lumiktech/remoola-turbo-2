import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import express from 'express';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerContractsService } from './consumer-contracts.service';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';
import { resolveRequestBaseUrl } from '../../../shared/request-base-url';

@ApiTags(`Consumer: Contracts`)
@Controller(`consumer/contracts`)
@UseGuards(JwtAuthGuard)
export class ConsumerContractsController {
  constructor(private readonly service: ConsumerContractsService) {}

  @Get()
  async list(
    @Identity() consumer: ConsumerModel,
    @Query(`query`) query?: string,
    @Query(`status`) status?: string,
    @Query(`hasDocuments`) hasDocuments?: string,
    @Query(`hasPayments`) hasPayments?: string,
    @Query(`sort`) sort?: string,
    @Query(`page`) page?: string,
    @Query(`pageSize`) pageSize?: string,
  ) {
    return this.service.getContracts(
      consumer.id,
      page ? Number(page) : undefined,
      pageSize ? Number(pageSize) : undefined,
      query,
      status,
      hasDocuments,
      hasPayments,
      sort,
    );
  }

  @Get(`:id/details`)
  async details(@Identity() consumer: ConsumerModel, @Param(`id`) id: string, @Req() req: express.Request) {
    return this.service.getDetails(id, consumer.id, resolveRequestBaseUrl(req));
  }
}
