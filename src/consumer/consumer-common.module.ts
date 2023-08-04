import { Module } from '@nestjs/common'

import { AuthModule } from './auth/auth.module'
import { AddressDetailsModule } from './entities/address-details/address-details.module'
import { BillingDetailsModule } from './entities/billing-details/billing-details.module'
import { ConsumerModule } from './entities/consumer/consumer.module'
import { CreditCardModule } from './entities/credit-card/credit-card.module'
import { GoogleProfileDetailsModule } from './entities/google-profile-details/google-profile-details.module'
import { OrganizationDetailsModule } from './entities/organization-details/organization-details.module'
import { PaymentRequestModule } from './entities/payment-request/payment-request.module'
import { PersonalDetailsModule } from './entities/personal-details/personal-details.module'
import { ResetPasswordModule } from './entities/reset-password/reset-password.module'

@Module({
  imports: [
    AuthModule,
    AddressDetailsModule,
    BillingDetailsModule,
    ConsumerModule,
    GoogleProfileDetailsModule,
    OrganizationDetailsModule,
    PersonalDetailsModule,
    PaymentRequestModule,
    ResetPasswordModule,
    CreditCardModule,
  ],
})
export class ConsumerCommonModule {}
