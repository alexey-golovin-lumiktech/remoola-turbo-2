import { Module } from '@nestjs/common';

import { AdminAuthController } from './auth/admin-auth.controller';
import { AdminAuthModule } from './auth/admin-auth.module';
import { AdminAdminsModule } from './modules/admins/admin-admins.module';
import { AdminAuditModule } from './modules/audit/admin-audit.module';
import { AdminConsumersModule } from './modules/consumers/admin-consumers.module';
import { AdminDashboardModule } from './modules/dashboard/admin-dashboard.module';
import { AdminExchangeModule } from './modules/exchange/admin-exchange.module';
import { AdminLedgersModule } from './modules/ledger/admin-ledger.module';
import { AdminPaymentRequestsModule } from './modules/payment-requests/admin-payment-requests.module';
import { ConsumerPaymentMethodsModule } from '../consumer/modules/payment-methods/consumer-payment-methods.module';
import { MailingModule } from '../shared/mailing.module';

@Module({
  imports: [
    AdminAuthModule,
    AdminAdminsModule,
    AdminAuditModule,
    AdminConsumersModule,
    AdminLedgersModule,
    AdminPaymentRequestsModule,
    AdminExchangeModule,
    AdminDashboardModule,
    ConsumerPaymentMethodsModule,
    MailingModule,
  ],
  controllers: [AdminAuthController],
})
export class AdminModule {}
