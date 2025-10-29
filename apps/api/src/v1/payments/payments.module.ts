import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PaymentEntity } from './payment.entity';
import { PaymentsController } from './payments.controller';
import { providers } from './providers';
import { ContractEntity } from '../contracts/contract.entity';

@Module({
  imports: [BullModule.registerQueue({ name: `payments` }), TypeOrmModule.forFeature([PaymentEntity, ContractEntity])],
  controllers: [PaymentsController],
  providers: providers,
  exports: providers,
})
export class PaymentsModule {}
