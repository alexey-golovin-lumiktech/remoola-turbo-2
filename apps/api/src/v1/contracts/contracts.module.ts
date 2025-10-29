import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { ContractEntity } from './contract.entity';
import { ContractsController } from './contracts.controller';
import { providers } from './providers';
import { ContractorEntity } from '../contractors/contractor.entity';
import { UserEntity } from '../users/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ContractEntity, ContractorEntity, UserEntity])],
  controllers: [ContractsController],
  providers: providers,
  exports: providers,
})
export class ContractsModule {}
