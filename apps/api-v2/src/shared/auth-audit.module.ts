import { Global, Module } from '@nestjs/common';

import { AdminActionAuditRepository } from './admin-action-audit.repository';
import { AdminActionAuditService } from './admin-action-audit.service';
import { AuthAuditQuery } from './auth-audit.query';
import { AuthAuditRepository } from './auth-audit.repository';
import { AuthAuditService } from './auth-audit.service';
import { ConsumerActionLogQuery } from './consumer-action-log.query';
import { ConsumerActionLogRepository } from './consumer-action-log.repository';
import { ConsumerActionLogService } from './consumer-action-log.service';
import { PrismaModule } from './prisma.module';

@Global()
@Module({
  imports: [PrismaModule],
  providers: [
    AdminActionAuditRepository,
    AuthAuditQuery,
    AuthAuditRepository,
    AuthAuditService,
    AdminActionAuditService,
    ConsumerActionLogQuery,
    ConsumerActionLogRepository,
    ConsumerActionLogService,
  ],
  exports: [AuthAuditService, AdminActionAuditService, ConsumerActionLogService],
})
export class AuthAuditModule {}
