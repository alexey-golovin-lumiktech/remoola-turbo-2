import { Module } from '@nestjs/common'

import { AuthModule } from './auth/auth.module'
import { AdminsModule } from './entities/admins/admins.module'
import { ConsumersModule } from './entities/consumers/consumer.module'
import { GoogleProfilesModule } from './entities/google-profiles/google-profiles.module'
import { InvoiceItemsModule } from './entities/invoice-items/invoice-items.module'
import { InvoicesModule } from './entities/invoices/invoices.module'

@Module({
  imports: [AdminsModule, GoogleProfilesModule, ConsumersModule, AuthModule, InvoicesModule, InvoiceItemsModule],
})
export class AdminModule {}
