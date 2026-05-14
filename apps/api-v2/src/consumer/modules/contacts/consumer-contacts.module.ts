import { Module } from '@nestjs/common';

import { ConsumerContactsController } from './consumer-contacts.controller';
import { ConsumerContactsRepository } from './consumer-contacts.repository';
import { ConsumerContactsService } from './consumer-contacts.service';

@Module({
  imports: [],
  controllers: [ConsumerContactsController],
  providers: [ConsumerContactsRepository, ConsumerContactsService],
  exports: [ConsumerContactsService],
})
export class ConsumerContactsModule {}
