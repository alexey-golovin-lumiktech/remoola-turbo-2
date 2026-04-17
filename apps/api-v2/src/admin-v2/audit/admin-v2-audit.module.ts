import { Module } from '@nestjs/common';

import { AdminV2AuditController } from './admin-v2-audit.controller';
import { AdminV2AuditService } from './admin-v2-audit.service';
import { AdminV2SharedModule } from '../admin-v2-shared.module';

@Module({
  imports: [AdminV2SharedModule],
  controllers: [AdminV2AuditController],
  providers: [AdminV2AuditService],
  exports: [AdminV2AuditService],
})
export class AdminV2AuditModule {}
