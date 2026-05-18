import { Module } from '@nestjs/common';

import { ConsumerAuthMaintenanceModule } from './auth/consumer-auth-maintenance.module';
import { ConsumerAuthModule } from './auth/consumer-auth.module';
import { ConsumerDashboardModule } from './modules/consumer-dashboard/consumer-dashboard.module';
import { ConsumerContactsModule } from './modules/contacts/consumer-contacts.module';
import { ConsumerContractsModule } from './modules/contracts/consumer-contracts.module';
import { ConsumerDocumentsModule } from './modules/documents/consumer-documents.module';
import { ConsumerExchangeModule } from './modules/exchange/consumer-exchange.module';
import { ConsumerPaymentMethodsModule } from './modules/payment-methods/consumer-payment-methods.module';
import { ConsumerPaymentsModule } from './modules/payments/consumer-payments.module';
import { ConsumerProfileModule } from './modules/profile/consumer-profile.module';
import { ConsumerSettingsModule } from './modules/settings/consumer-settings.module';

@Module({
  imports: [
    ConsumerAuthModule,
    ConsumerAuthMaintenanceModule,
    ConsumerDashboardModule,
    ConsumerContactsModule,
    ConsumerContractsModule,
    ConsumerDocumentsModule,
    ConsumerExchangeModule,
    ConsumerPaymentMethodsModule,
    ConsumerPaymentsModule,
    ConsumerProfileModule,
    ConsumerSettingsModule,
  ],
  exports: [ConsumerAuthModule],
})
export class ConsumerModule {}
