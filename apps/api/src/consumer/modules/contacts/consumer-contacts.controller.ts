import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

import { type ConsumerModel } from '@remoola/database-2';

import { ConsumerContactsService } from './consumer-contacts.service';
import { ConsumerContactsResponse, ConsumerCreateContact, ConsumerUpdateContact } from './dto/consumer-contact.dto';
import { JwtAuthGuard } from '../../../auth/jwt.guard';
import { Identity } from '../../../common/decorators/identity.decorator';

@ApiTags(`Consumer: Contacts`)
@Controller(`consumer/contacts`)
@UseGuards(JwtAuthGuard)
export class ConsumerContactsController {
  constructor(private service: ConsumerContactsService) {}

  @Get()
  async list(@Identity() identity: ConsumerModel): Promise<ConsumerContactsResponse> {
    const items = await this.service.list(identity.id);
    return { items };
  }

  @Post()
  async create(@Identity() identity: ConsumerModel, @Body() body: ConsumerCreateContact) {
    return this.service.create(identity.id, body);
  }

  @Patch(`:id`)
  async update(@Identity() identity: ConsumerModel, @Param(`id`) id: string, @Body() body: ConsumerUpdateContact) {
    return this.service.update(id, identity.id, body);
  }

  @Delete(`:id`)
  async delete(@Identity() identity: ConsumerModel, @Param(`id`) id: string) {
    return this.service.delete(id, identity.id);
  }

  @Get(`:id/details`)
  async details(@Identity() identity: ConsumerModel, @Param(`id`) id: string) {
    return this.service.getDetails(id, identity.id);
  }
}
