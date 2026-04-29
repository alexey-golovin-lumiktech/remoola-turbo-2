import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';
import { IsEmail, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import express from 'express';

import { ConsumerContactsService } from './consumer-contacts.service';
import {
  ConsumerContactSearchItem,
  ConsumerContactsResponse,
  ConsumerCreateContact,
  ConsumerUpdateContact,
} from './dto/consumer-contact.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity, type IIdentityContext } from '../../../common';
import { resolveRequestBaseUrl } from '../../../shared/request-base-url';

class ConsumerContactsListQuery {
  @Expose()
  @IsString()
  @IsOptional()
  query?: string;

  @Expose()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @IsOptional()
  limit?: number;

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

class ConsumerContactLookupQuery {
  @Expose()
  @IsEmail()
  email!: string;
}

@ApiTags(`Consumer: Contacts`)
@Controller(`consumer/contacts`)
@UseGuards(JwtAuthGuard)
export class ConsumerContactsController {
  constructor(private service: ConsumerContactsService) {}

  @Get()
  async list(
    @Identity() consumer: IIdentityContext,
    @Query() query: ConsumerContactsListQuery,
  ): Promise<ConsumerContactsResponse | ConsumerContactSearchItem[]> {
    if (query.query != null && query.query.trim() !== ``) {
      return this.service.search(consumer.id, query.query, query.limit ?? 10);
    }
    return this.service.list(consumer.id, query.page, query.pageSize);
  }

  @Get(`lookup/by-email`)
  async findByExactEmail(@Identity() consumer: IIdentityContext, @Query() query: ConsumerContactLookupQuery) {
    return this.service.findByExactEmail(consumer.id, query.email);
  }

  @Post()
  async create(@Identity() consumer: IIdentityContext, @Body() body: ConsumerCreateContact) {
    return this.service.create(consumer.id, body);
  }

  @Get(`:id`)
  async get(@Identity() consumer: IIdentityContext, @Param(`id`) id: string) {
    return this.service.get(id, consumer.id);
  }

  @Patch(`:id`)
  async update(@Identity() consumer: IIdentityContext, @Param(`id`) id: string, @Body() body: ConsumerUpdateContact) {
    return this.service.update(id, consumer.id, body);
  }

  @Delete(`:id`)
  async delete(@Identity() consumer: IIdentityContext, @Param(`id`) id: string) {
    return this.service.delete(id, consumer.id);
  }

  @Get(`:id/details`)
  async details(@Identity() consumer: IIdentityContext, @Param(`id`) id: string, @Req() req: express.Request) {
    return this.service.getDetails(id, consumer.id, resolveRequestBaseUrl(req));
  }
}
