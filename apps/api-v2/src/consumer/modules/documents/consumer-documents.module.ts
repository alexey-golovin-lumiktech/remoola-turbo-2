import { Module } from '@nestjs/common';

import { ConsumerDocumentsController } from './consumer-documents.controller';
import { ConsumerDocumentsService } from './consumer-documents.service';
import { FilesModule } from '../files/files.module';

@Module({
  imports: [FilesModule],
  controllers: [ConsumerDocumentsController],
  providers: [ConsumerDocumentsService],
  exports: [ConsumerDocumentsService, FilesModule],
})
export class ConsumerDocumentsModule {}
