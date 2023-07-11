import { Module } from '@nestjs/common'

import { AuthModule } from './auth/auth.module'
import { AdminAddressDetailsModule } from './entities/address-details/admin-address-details.module'
import { AdminModule } from './entities/admin/admin.module'
import { AdminBillingDetailsModule } from './entities/billing-details/admin-billing-details.module'
import { AdminConsumerModule } from './entities/consumer/admin-consumer.module'
import { AdminGoogleProfileDetailsModule } from './entities/google-profile-details/admin-google-profile-details.module'
import { AdminOrganizationDetailsModule } from './entities/organization-details/admin-organization-details.module'
import { AdminPaymentRequestModule } from './entities/payment-request/admin-payment-request.module'
import { AdminPersonalDetailsModule } from './entities/personal-details/admin-personal-details.module'

@Module({
  imports: [
    AdminModule,
    AdminGoogleProfileDetailsModule,
    AdminConsumerModule,
    AuthModule,
    AdminPaymentRequestModule,
    AdminAddressDetailsModule,
    AdminOrganizationDetailsModule,
    AdminPersonalDetailsModule,
    AdminBillingDetailsModule,
  ],
})
export class AdminCommonModule {}
