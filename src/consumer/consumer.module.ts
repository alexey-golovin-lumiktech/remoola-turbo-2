import { Module } from '@nestjs/common'

import { AuthModule } from './auth/auth.module'
import { AddressDetailsModule } from './entities/address-details/address-details.module'
import { BillingDetailsModule } from './entities/billing-details/billing-details.module'
import { ConsumersModule } from './entities/consumers/consumer.module'
import { GoogleProfilesModule } from './entities/google-profiles/google-profiles.module'
import { InvoiceItemsModule } from './entities/invoice-items/invoice-items.module'
import { InvoicesModule } from './entities/invoices/invoices.module'
import { OrganizationDetailsModule } from './entities/organization-details/organization-details.module'
import { PersonalDetailsModule } from './entities/personal-details/personal-details.module'
import { PaymentsModule } from './payments/payments.module'

@Module({
  imports: [
    GoogleProfilesModule,
    ConsumersModule,
    AuthModule,
    PaymentsModule,
    BillingDetailsModule,
    InvoicesModule,
    InvoiceItemsModule,
    AddressDetailsModule,
    PersonalDetailsModule,
    OrganizationDetailsModule,
  ],
})
export class ConsumerModule {}
