import { Module } from '@nestjs/common';

import { ConsumerContactsController } from './consumer-contacts.controller';
import { ConsumerContactsService } from './consumer-contacts.service';

@Module({
  imports: [],
  controllers: [ConsumerContactsController],
  providers: [ConsumerContactsService],
  exports: [ConsumerContactsService],
})
export class ConsumerContactsModule {}
