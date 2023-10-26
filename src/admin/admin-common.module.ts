import { Module } from '@nestjs/common'

import { AdminAuthModule } from './auth/admin-auth.module'
import { AdminAddressDetailsModule } from './entities/address-details/admin-address-details.module'
import { AdminModule } from './entities/admin/admin.module'
import { AdminBillingDetailsModule } from './entities/billing-details/admin-billing-details.module'
import { AdminConsumerModule } from './entities/consumer/admin-consumer.module'
import { AdminContactModule } from './entities/contact/admin-contact.module'
import { AdminExchangeRateModule } from './entities/exchange-rate/admin-exchange-rate.module'
import { AdminGoogleProfileDetailsModule } from './entities/google-profile-details/admin-google-profile-details.module'
import { AdminOrganizationDetailsModule } from './entities/organization-details/admin-organization-details.module'
import { AdminPaymentMethodModule } from './entities/payment-method/admin-payment-method.module'
import { AdminPaymentRequestModule } from './entities/payment-request/admin-payment-request.module'
import { AdminPersonalDetailsModule } from './entities/personal-details/admin-personal-details.module'
import { AdminTransactionModule } from './entities/transaction/admin-transaction.module'

@Module({
  imports: [
    AdminModule,
    AdminGoogleProfileDetailsModule,
    AdminConsumerModule,
    AdminAuthModule,
    AdminPaymentRequestModule,
    AdminAddressDetailsModule,
    AdminOrganizationDetailsModule,
    AdminPersonalDetailsModule,
    AdminBillingDetailsModule,
    AdminContactModule,
    AdminTransactionModule,
    AdminExchangeRateModule,
    AdminPaymentMethodModule,
  ],
})
export class AdminCommonModule {}
