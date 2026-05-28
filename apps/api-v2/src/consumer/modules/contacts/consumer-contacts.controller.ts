import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import express from 'express';

import {
  consumerContactDetailsResponseSchema,
  consumerContactResponseSchema,
  consumerContactSearchItemSchema,
  consumerContactSearchResponseSchema,
  consumerContactsResponseSchema,
  consumerSuccessResponseSchema,
  type ConsumerContactDetailsResponse,
  type ConsumerContactResponse,
  type ConsumerContactSearchItem,
  type ConsumerContactSearchResponse,
  type ConsumerContactsResponse,
  type ConsumerSuccessResponse,
} from '@remoola/api-types';

import { ConsumerContactsService } from './consumer-contacts.service';
import {
  ConsumerCreateContact,
  ConsumerUpdateContact,
  ConsumerContactsListWithPagingQuery,
  ConsumerContactLookupQuery,
} from './dto/consumer-contact.dto';
import { Identity, type IIdentityContext } from '../../../common';
import { resolveRequestBaseUrl } from '../../../shared/request-base-url';
import { toConsumerWireContract } from '../../consumer-wire-contract';

@ApiTags(`Consumer: Contacts`)
@Controller(`consumer/contacts`)
export class ConsumerContactsController {
  constructor(private service: ConsumerContactsService) {}

  @Get()
  async list(
    @Identity() consumer: IIdentityContext,
    @Query() query: ConsumerContactsListWithPagingQuery,
  ): Promise<ConsumerContactsResponse | ConsumerContactSearchResponse> {
    if (query.query != null && query.query.trim() !== ``) {
      return toConsumerWireContract(
        consumerContactSearchResponseSchema,
        await this.service.search(consumer.id, query.query, query.limit ?? 10),
      );
    }
    return toConsumerWireContract(
      consumerContactsResponseSchema,
      await this.service.list(consumer.id, query.page, query.pageSize),
    );
  }

  @Get(`lookup/by-email`)
  async findByExactEmail(
    @Identity() consumer: IIdentityContext,
    @Query() query: ConsumerContactLookupQuery,
  ): Promise<ConsumerContactSearchItem | null> {
    return toConsumerWireContract(
      consumerContactSearchItemSchema.nullable(),
      await this.service.findByExactEmail(consumer.id, query.email),
    );
  }

  @Post()
  async create(
    @Identity() consumer: IIdentityContext,
    @Body() body: ConsumerCreateContact,
  ): Promise<ConsumerContactResponse> {
    return toConsumerWireContract(consumerContactResponseSchema, await this.service.create(consumer.id, body));
  }

  @Get(`:id`)
  async get(@Identity() consumer: IIdentityContext, @Param(`id`) id: string): Promise<ConsumerContactResponse> {
    return toConsumerWireContract(consumerContactResponseSchema, await this.service.get(id, consumer.id));
  }

  @Patch(`:id`)
  async update(
    @Identity() consumer: IIdentityContext,
    @Param(`id`) id: string,
    @Body() body: ConsumerUpdateContact,
  ): Promise<ConsumerContactResponse> {
    return toConsumerWireContract(consumerContactResponseSchema, await this.service.update(id, consumer.id, body));
  }

  @Delete(`:id`)
  async delete(@Identity() consumer: IIdentityContext, @Param(`id`) id: string): Promise<ConsumerSuccessResponse> {
    return toConsumerWireContract(consumerSuccessResponseSchema, await this.service.delete(id, consumer.id));
  }

  @Get(`:id/details`)
  async details(
    @Identity() consumer: IIdentityContext,
    @Param(`id`) id: string,
    @Req() req: express.Request,
  ): Promise<ConsumerContactDetailsResponse> {
    return toConsumerWireContract(
      consumerContactDetailsResponseSchema,
      await this.service.getDetails(id, consumer.id, resolveRequestBaseUrl(req)),
    );
  }
}
