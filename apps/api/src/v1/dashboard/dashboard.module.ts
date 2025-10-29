import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DashboardController } from './dashboard.controller';
import { providers } from './providers';
import { ComplianceChecklistEntity } from '../compliance/compliance.entity';
import { ContractEntity } from '../contracts/contract.entity';
import { ContractsModule } from '../contracts/contracts.module';
import { DocumentsModule } from '../documents/documents.module';
import { PaymentEntity } from '../payments/payment.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ComplianceChecklistEntity, ContractEntity, PaymentEntity]),
    DocumentsModule,
    ContractsModule,
  ],
  controllers: [DashboardController],
  providers: providers,
  exports: providers,
})
export class DashboardModule {}
