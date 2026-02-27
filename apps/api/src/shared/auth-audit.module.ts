import { Global, Module } from '@nestjs/common';

import { AdminActionAuditService } from './admin-action-audit.service';
import { AuthAuditService } from './auth-audit.service';

@Global()
@Module({
  providers: [AuthAuditService, AdminActionAuditService],
  exports: [AuthAuditService, AdminActionAuditService],
})
export class AuthAuditModule {}
