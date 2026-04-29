import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Expose, Transform, Type } from 'class-transformer';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';
import express from 'express';

import { ConsumerContractsService } from './consumer-contracts.service';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../../common';
import { resolveRequestBaseUrl } from '../../../shared/request-base-url';

class ConsumerContractsListQuery {
  @Expose()
  @IsString()
  @IsOptional()
  query?: string;

  @Expose()
  @IsString()
  @IsOptional()
  status?: string;

  @Expose()
  @Transform(({ value }) =>
    value === true || value === `true` ? `true` : value === false || value === `false` ? `false` : undefined,
  )
  @IsOptional()
  hasDocuments?: string;

  @Expose()
  @Transform(({ value }) =>
    value === true || value === `true` ? `true` : value === false || value === `false` ? `false` : undefined,
  )
  @IsOptional()
  hasPayments?: string;

  @Expose()
  @IsString()
  @IsOptional()
  sort?: string;

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

@ApiTags(`Consumer: Contracts`)
@Controller(`consumer/contracts`)
@UseGuards(JwtAuthGuard)
export class ConsumerContractsController {
  constructor(private readonly service: ConsumerContractsService) {}

  @Get()
  async list(@Identity() consumer: IIdentityContext, @Query() query: ConsumerContractsListQuery) {
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
