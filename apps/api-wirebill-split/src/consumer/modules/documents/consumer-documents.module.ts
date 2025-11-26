import { Module } from '@nestjs/common';

import { ConsumerDocumentsController } from './consumer-documents.controller';
import { ConsumerDocumentsService } from './consumer-documents.service';
import { FileStorageService } from '../files/file-storage.service';

@Module({
  imports: [],
  controllers: [ConsumerDocumentsController],
  providers: [FileStorageService, ConsumerDocumentsService],
  exports: [FileStorageService, ConsumerDocumentsService],
})
export class ConsumerDocumentsModule {}
