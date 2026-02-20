import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerContactsService } from './consumer-contacts.service';
import { ConsumerContactsResponse, ConsumerCreateContact, ConsumerUpdateContact } from './dto/consumer-contact.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common';

@ApiTags(`Consumer: Contacts`)
@Controller(`consumer/contacts`)
@UseGuards(JwtAuthGuard)
export class ConsumerContactsController {
  constructor(private service: ConsumerContactsService) {}

  @Get()
  async list(
    @Identity() consumer: ConsumerModel,
    @Query(`page`) page?: string,
    @Query(`pageSize`) pageSize?: string,
  ): Promise<ConsumerContactsResponse> {
    return this.service.list(consumer.id, page ? Number(page) : undefined, pageSize ? Number(pageSize) : undefined);
  }

  @Post()
  async create(@Identity() consumer: ConsumerModel, @Body() body: ConsumerCreateContact) {
    return this.service.create(consumer.id, body);
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
  async details(@Identity() consumer: ConsumerModel, @Param(`id`) id: string) {
    return this.service.getDetails(id, consumer.id);
  }
}
