import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import express from 'express';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerContactsService } from './consumer-contacts.service';
import {
  ConsumerContactSearchItem,
  ConsumerContactsResponse,
  ConsumerCreateContact,
  ConsumerUpdateContact,
} from './dto/consumer-contact.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';
import { resolveRequestBaseUrl } from '../../../shared/request-base-url';

@ApiTags(`Consumer: Contacts`)
@Controller(`consumer/contacts`)
@UseGuards(JwtAuthGuard)
export class ConsumerContactsController {
  constructor(private service: ConsumerContactsService) {}

  @Get()
  async list(
    @Identity() consumer: ConsumerModel,
    @Query(`query`) query?: string,
    @Query(`limit`) limit?: string,
    @Query(`page`) page?: string,
    @Query(`pageSize`) pageSize?: string,
  ): Promise<ConsumerContactsResponse | ConsumerContactSearchItem[]> {
    if (query != null && query.trim() !== ``) {
      return this.service.search(consumer.id, query, limit ? Number(limit) : 10);
    }
    return this.service.list(consumer.id, page ? Number(page) : undefined, pageSize ? Number(pageSize) : undefined);
  }

  @Get(`lookup/by-email`)
  async findByExactEmail(@Identity() consumer: ConsumerModel, @Query(`email`) email?: string) {
    return this.service.findByExactEmail(consumer.id, email ?? ``);
  }

  @Post()
  async create(@Identity() consumer: ConsumerModel, @Body() body: ConsumerCreateContact) {
    return this.service.create(consumer.id, body);
  }

  @Get(`:id`)
  async get(@Identity() consumer: ConsumerModel, @Param(`id`) id: string) {
    return this.service.get(id, consumer.id);
  }

  @Patch(`:id`)
  async update(@Identity() consumer: ConsumerModel, @Param(`id`) id: string, @Body() body: ConsumerUpdateContact) {
    return this.service.update(id, consumer.id, body);
  }

  @Delete(`:id`)
  async delete(@Identity() consumer: ConsumerModel, @Param(`id`) id: string) {
    return this.service.delete(id, consumer.id);
  }

  @Get(`:id/details`)
  async details(@Identity() consumer: ConsumerModel, @Param(`id`) id: string, @Req() req: express.Request) {
    return this.service.getDetails(id, consumer.id, resolveRequestBaseUrl(req));
  }
}
