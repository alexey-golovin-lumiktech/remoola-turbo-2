import { Module } from '@nestjs/common';

import { FileStorageService } from '../../consumer/modules/files/file-storage.service';
import { AdminV2SharedModule } from '../admin-v2-shared.module';
import { AdminV2DocumentsController } from './admin-v2-documents.controller';
import { AdminV2DocumentsService } from './admin-v2-documents.service';

@Module({
  imports: [AdminV2SharedModule],
  controllers: [AdminV2DocumentsController],
  providers: [FileStorageService, AdminV2DocumentsService],
})
export class AdminV2DocumentsModule {}
