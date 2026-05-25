import { Module } from '@nestjs/common';

import { ConsumerDocumentAccessPolicy } from './consumer-document-access-policy';
import { ConsumerDocumentListRepository } from './consumer-document-list.repository';
import { ConsumerDocumentRepository } from './consumer-document.repository';
import { ConsumerDocumentsController } from './consumer-documents.controller';
import { ConsumerDocumentsService } from './consumer-documents.service';
import { InfrastructureStorageModule } from '../../../infrastructure/storage/infrastructure-storage.module';

@Module({
  imports: [InfrastructureStorageModule],
  controllers: [ConsumerDocumentsController],
  providers: [
    ConsumerDocumentRepository,
    ConsumerDocumentAccessPolicy,
    ConsumerDocumentListRepository,
    ConsumerDocumentsService,
  ],
  exports: [ConsumerDocumentsService, InfrastructureStorageModule],
})
export class ConsumerDocumentsModule {}
