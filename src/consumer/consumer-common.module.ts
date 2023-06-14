import { Module } from '@nestjs/common'

import { AuthModule } from './auth/auth.module'
import { AddressDetailsModule } from './entities/address-details/address-details.module'
import { BillingDetailsModule } from './entities/billing-details/billing-details.module'
import { ConsumerModule } from './entities/consumer/consumer.module'
import { GoogleProfilesModule } from './entities/google-profiles/google-profiles.module'
import { InvoiceModule } from './entities/invoice/invoice.module'
import { InvoiceItemModule } from './entities/invoice-item/invoice-item.module'
import { OrganizationDetailsModule } from './entities/organization-details/organization-details.module'
import { PersonalDetailsModule } from './entities/personal-details/personal-details.module'
import { PaymentsModule } from './payments/payments.module'

@Module({
  imports: [
    AuthModule,
    AddressDetailsModule,
    BillingDetailsModule,
    ConsumerModule,
    GoogleProfilesModule,
    InvoiceItemModule,
    InvoiceModule,
    OrganizationDetailsModule,
    PersonalDetailsModule,
    PaymentsModule,
  ],
})
export class ConsumerCommonModule {}
