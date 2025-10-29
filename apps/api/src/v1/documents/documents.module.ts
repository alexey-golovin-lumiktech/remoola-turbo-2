import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DocumentEntity } from './document.entity';
import { DocumentsController } from './documents.controller';
import { providers } from './providers';
import { ContractEntity } from '../contracts/contract.entity';

@Module({
  imports: [TypeOrmModule.forFeature([DocumentEntity, ContractEntity])],
  controllers: [DocumentsController],
  providers: providers,
  exports: providers,
})
export class DocumentsModule {}
