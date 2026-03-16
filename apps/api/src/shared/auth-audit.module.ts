import { Global, Module } from '@nestjs/common';

import { AdminActionAuditService } from './admin-action-audit.service';
import { AuthAuditService } from './auth-audit.service';
import { ConsumerActionLogService } from './consumer-action-log.service';

@Global()
@Module({
  providers: [AuthAuditService, AdminActionAuditService, ConsumerActionLogService],
  exports: [AuthAuditService, AdminActionAuditService, ConsumerActionLogService],
})
export class AuthAuditModule {}
