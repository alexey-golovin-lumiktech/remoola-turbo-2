import { Module } from '@nestjs/common';

import { AdminV2SharedModule } from './admin-v2-shared.module';
import { AdminV2Controller } from './admin-v2.controller';
import { AdminV2AdminsModule } from './admins/admin-v2-admins.module';
import { AdminAuthModule } from '../admin-auth/admin-auth.module';
import { AdminV2AssignmentsModule } from './assignments/admin-v2-assignments.module';
import { AdminV2AuditModule } from './audit/admin-v2-audit.module';
import { AdminV2AuthController } from './auth/admin-v2-auth.controller';
import { AdminV2ConsumersModule } from './consumers/admin-v2-consumers.module';
import { AdminV2DocumentsModule } from './documents/admin-v2-documents.module';
import { AdminV2ExchangeModule } from './exchange/admin-v2-exchange.module';
import { AdminV2LedgerModule } from './ledger/admin-v2-ledger.module';
import { AdminV2OperationalAlertsModule } from './operational-alerts/admin-v2-operational-alerts.module';
import { AdminV2OverviewModule } from './overview/admin-v2-overview.module';
import { AdminV2PaymentMethodsModule } from './payment-methods/admin-v2-payment-methods.module';
import { AdminV2PaymentsModule } from './payments/admin-v2-payments.module';
import { AdminV2PayoutsModule } from './payouts/admin-v2-payouts.module';
import { AdminV2QuickstartsModule } from './quickstarts/admin-v2-quickstarts.module';
import { AdminV2SavedViewsModule } from './saved-views/admin-v2-saved-views.module';
import { AdminV2SystemModule } from './system/admin-v2-system.module';
import { AdminV2VerificationModule } from './verification/admin-v2-verification.module';

@Module({
  imports: [
    AdminAuthModule,
    AdminV2SharedModule,
    AdminV2ConsumersModule,
    AdminV2AdminsModule,
    AdminV2AssignmentsModule,
    AdminV2AuditModule,
    AdminV2OverviewModule,
    AdminV2VerificationModule,
    AdminV2PaymentsModule,
    AdminV2LedgerModule,
    AdminV2DocumentsModule,
    AdminV2ExchangeModule,
    AdminV2PaymentMethodsModule,
    AdminV2PayoutsModule,
    AdminV2QuickstartsModule,
    AdminV2SavedViewsModule,
    AdminV2OperationalAlertsModule,
    AdminV2SystemModule,
  ],
  controllers: [AdminV2Controller, AdminV2AuthController],
})
export class AdminV2Module {}
