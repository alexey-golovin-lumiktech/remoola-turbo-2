import { Module } from '@nestjs/common';

import { FilesModule } from '../../consumer/modules/files/files.module';
import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminDocumentTagService } from './admin-document-tag.service';
import { AdminDocumentTaggerService } from './admin-document-tagger.service';
import { AdminDocumentService } from './admin-document.service';
import { AdminV2DocumentsCommandsRepository } from './admin-v2-documents-commands.repository';
import { AdminV2DocumentsController } from './admin-v2-documents.controller';
import { AdminV2DocumentsRepository } from './admin-v2-documents.repository';
import { AdminV2AssignmentsModule } from '../assignments/admin-v2-assignments.module';

@Module({
  imports: [AdminV2SharedModule, AdminV2AssignmentsModule, FilesModule],
  controllers: [AdminV2DocumentsController],
  providers: [
    AdminV2DocumentsRepository,
    AdminV2DocumentsCommandsRepository,
    AdminDocumentTagService,
    AdminDocumentTaggerService,
    AdminDocumentService,
  ],
})
export class AdminV2DocumentsModule {}
