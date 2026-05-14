import { Module } from '@nestjs/common';

import { ConsumerDocumentAccessPolicy } from './consumer-document-access-policy';
import { ConsumerDocumentListRepository } from './consumer-document-list.repository';
import { ConsumerDocumentRepository } from './consumer-document.repository';
import { ConsumerDocumentsController } from './consumer-documents.controller';
import { ConsumerDocumentsService } from './consumer-documents.service';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [ConsumerDocumentsController],
  providers: [
    ConsumerDocumentRepository,
    ConsumerDocumentAccessPolicy,
    ConsumerDocumentListRepository,
    ConsumerDocumentsService,
  ],
  exports: [ConsumerDocumentsService, FilesModule],
})
export class ConsumerDocumentsModule {}
