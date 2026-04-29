import { Module } from '@nestjs/common';

import { FilesModule } from '../../consumer/modules/files/files.module';
import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2DocumentsController } from './admin-v2-documents.controller';
import { AdminV2DocumentsService } from './admin-v2-documents.service';
import { AdminV2AssignmentsModule } from '../assignments/admin-v2-assignments.module';

@Module({
  imports: [AdminV2SharedModule, AdminV2AssignmentsModule, FilesModule],
  controllers: [AdminV2DocumentsController],
  providers: [AdminV2DocumentsService],
})
export class AdminV2DocumentsModule {}
