import { Module } from '@nestjs/common';

import { ConsumerPaymentsController } from './consumer-payments.controller';
import { ConsumerPaymentsService } from './consumer-payments.service';

@Module({
  imports: [],
  controllers: [ConsumerPaymentsController],
  providers: [ConsumerPaymentsService],
  exports: [ConsumerPaymentsService],
})
export class ConsumerPaymentsModule {}
