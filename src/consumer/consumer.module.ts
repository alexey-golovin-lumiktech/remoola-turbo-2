import { Module } from '@nestjs/common'

import { AuthModule } from './auth/auth.module'
import { AddressesModule } from './entities/addresses/addresses.module'
import { BillingDetailsModule } from './entities/billing-details/billing-details.module'
import { ConsumersModule } from './entities/consumers/consumers.module'
import { GoogleProfilesModule } from './entities/google-profiles/google-profiles.module'
import { InvoiceItemsModule } from './entities/invoice-items/invoice-items.module'
import { InvoicesModule } from './entities/invoices/invoices.module'
import { PaymentsModule } from './payments/payments.module'

@Module({
  imports: [
    GoogleProfilesModule,
    ConsumersModule,
    AuthModule,
    PaymentsModule,
    AddressesModule,
    BillingDetailsModule,
    InvoicesModule,
    InvoiceItemsModule,
  ],
})
export class ConsumerModule {}
