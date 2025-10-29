import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { providers } from './providers';
import { ContractorEntity } from '../contractors/contractor.entity';
import { ContractEntity } from '../contracts/contract.entity';
import { DocumentEntity } from '../documents/document.entity';
import { PaymentEntity } from '../payments/payment.entity';
import { UserEntity } from '../users/user.entity';
import { AdminsController } from './controllers/admins.controller';
import { ClientsController } from './controllers/clients.controller';
import { ContractorsController } from './controllers/contractors.controller';
import { ContractsController } from './controllers/contracts.controller';
import { DocumentsController } from './controllers/documents.controller';
import { GlobalSearchController } from './controllers/global-search.controller';
import { PaymentsController } from './controllers/payments.controller';
import { UsersController } from './controllers/users.controller';

@Module({
  imports: [TypeOrmModule.forFeature([UserEntity, ContractorEntity, ContractEntity, PaymentEntity, DocumentEntity])],
  controllers: [
    AdminsController,
    ClientsController,
    ContractorsController,
    ContractsController,
    DocumentsController,
    GlobalSearchController,
    PaymentsController,
    UsersController,
  ],
  providers: providers,
  exports: providers,
})
export class AdminModule {}
