import { Global, Module } from '@nestjs/common';

import { AuthAuditService } from './auth-audit.service';

@Global()
@Module({
  providers: [AuthAuditService],
  exports: [AuthAuditService],
})
export class AuthAuditModule {}
