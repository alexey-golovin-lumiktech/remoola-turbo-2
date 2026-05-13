import { Module } from '@nestjs/common';

import { ConsumerDocumentAccessPolicy } from './consumer-document-access-policy';
import { ConsumerDocumentListQuery } from './consumer-document-list.query';
import { ConsumerDocumentsController } from './consumer-documents.controller';
import { ConsumerDocumentsService } from './consumer-documents.service';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [ConsumerDocumentsController],
  providers: [ConsumerDocumentAccessPolicy, ConsumerDocumentListQuery, ConsumerDocumentsService],
  exports: [ConsumerDocumentsService, FilesModule],
})
export class ConsumerDocumentsModule {}
