import { Module } from '@nestjs/common';

import { AdminV2AuditController } from './admin-v2-audit.controller';
import { AdminV2AuditService } from './admin-v2-audit.service';

@Module({
  controllers: [AdminV2AuditController],
  providers: [AdminV2AuditService],
  exports: [AdminV2AuditService],
})
export class AdminV2AuditModule {}
