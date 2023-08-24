import { Module } from '@nestjs/common'
import { ResourceModule } from 'src/common-shared-modules/resource/resource.module'

import { AuthModule } from './auth/auth.module'
import { AddressDetailsModule } from './entities/address-details/address-details.module'
import { BillingDetailsModule } from './entities/billing-details/billing-details.module'
import { ConsumerModule } from './entities/consumer/consumer.module'
import { ConsumerResourceModule } from './entities/consumer-resource/consumer-resource.module'
import { ContactModule } from './entities/contact/contact.module'
import { CreditCardModule } from './entities/credit-card/credit-card.module'
import { GoogleProfileDetailsModule } from './entities/google-profile-details/google-profile-details.module'
import { OrganizationDetailsModule } from './entities/organization-details/organization-details.module'
import { PaymentRequestModule } from './entities/payment-request/payment-request.module'
import { PaymentRequestAttachmentModule } from './entities/payment-request-attachment/payment-request-attachment.module'
import { PersonalDetailsModule } from './entities/personal-details/personal-details.module'
import { ResetPasswordModule } from './entities/reset-password/reset-password.module'

@Module({
  imports: [
    ResourceModule,
    AuthModule,
    AddressDetailsModule,
    BillingDetailsModule,
    ConsumerModule,
    ConsumerResourceModule,
    ContactModule,
    CreditCardModule,
    GoogleProfileDetailsModule,
    OrganizationDetailsModule,
    PaymentRequestModule,
    PersonalDetailsModule,
    ResetPasswordModule,
    PaymentRequestAttachmentModule,
  ],
})
export class ConsumerCommonModule {}
