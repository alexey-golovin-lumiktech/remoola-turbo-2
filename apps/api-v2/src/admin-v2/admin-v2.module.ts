import { Module } from '@nestjs/common';

import { AdminV2Controller } from './admin-v2.controller';
import { AdminAuthModule } from '../admin/auth/admin-auth.module';
import { OriginResolverService } from '../shared/origin-resolver.service';
import { AdminV2AuditModule } from './audit/admin-v2-audit.module';
import { AdminV2AuthController } from './auth/admin-v2-auth.controller';
import { AdminV2ConsumersModule } from './consumers/admin-v2-consumers.module';
import { AdminV2LedgerModule } from './ledger/admin-v2-ledger.module';
import { AdminV2OverviewModule } from './overview/admin-v2-overview.module';
import { AdminV2PaymentsModule } from './payments/admin-v2-payments.module';
import { AdminV2VerificationModule } from './verification/admin-v2-verification.module';

@Module({
  imports: [
    AdminAuthModule,
    AdminV2ConsumersModule,
    AdminV2AuditModule,
    AdminV2OverviewModule,
    AdminV2VerificationModule,
    AdminV2PaymentsModule,
    AdminV2LedgerModule,
  ],
  controllers: [AdminV2Controller, AdminV2AuthController],
  providers: [OriginResolverService],
})
export class AdminV2Module {}
