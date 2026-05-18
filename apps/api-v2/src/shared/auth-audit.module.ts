import { Global, Module } from '@nestjs/common';

import {
  ADMIN_ACTION_AUDIT_ACTIONS_TOKEN,
  DEFAULT_ADMIN_ACTION_AUDIT_ACTIONS,
  AdminActionAuditPolicyService,
} from './admin-action-audit-policy.service';
import { AdminActionAuditRepository } from './admin-action-audit.repository';
import { AdminActionAuditService } from './admin-action-audit.service';
import { AuthAuditQuery } from './auth-audit.query';
import { AuthAuditRepository } from './auth-audit.repository';
import { AuthAuditService } from './auth-audit.service';
import {
  CONSUMER_ACTION_LOG_CRITICAL_ACTION_PREFIXES,
  DEFAULT_CONSUMER_ACTION_LOG_CRITICAL_ACTION_PREFIXES,
  ConsumerActionLogPolicyService,
} from './consumer-action-log-policy.service';
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
    {
      provide: ADMIN_ACTION_AUDIT_ACTIONS_TOKEN,
      useValue: DEFAULT_ADMIN_ACTION_AUDIT_ACTIONS,
    },
    AdminActionAuditPolicyService,
    AdminActionAuditService,
    {
      provide: CONSUMER_ACTION_LOG_CRITICAL_ACTION_PREFIXES,
      useValue: DEFAULT_CONSUMER_ACTION_LOG_CRITICAL_ACTION_PREFIXES,
    },
    ConsumerActionLogPolicyService,
    ConsumerActionLogQuery,
    ConsumerActionLogRepository,
    ConsumerActionLogService,
  ],
  exports: [AuthAuditService, AdminActionAuditService, ConsumerActionLogService],
})
export class AuthAuditModule {}
