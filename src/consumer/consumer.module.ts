import { Module } from '@nestjs/common'

import { AuthModule } from './auth/auth.module'
import { BillingDetailsModule } from './entities/billing-details/billing-details.module'
import { ConsumersModule } from './entities/consumers/consumer.module'
import { GoogleProfilesModule } from './entities/google-profiles/google-profiles.module'
import { InvoicesModule } from './entities/invoices/invoices.module'
import { PaymentsModule } from './payments/payments.module'

@Module({
  imports: [GoogleProfilesModule, ConsumersModule, AuthModule, PaymentsModule, BillingDetailsModule, InvoicesModule],
})
export class ConsumerModule {}
