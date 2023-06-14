import { Module } from '@nestjs/common'

import { AuthModule } from './auth/auth.module'
import { AdminModule } from './entities/admin/admin.module'
import { AdminConsumerModule } from './entities/consumer/admin-consumer.module'
import { AdminGoogleProfileDetailsModule } from './entities/google-profile-details/admin-google-profile-details.module'
import { AdminInvoiceModule } from './entities/invoice/admin-invoice.module'
import { AdminInvoiceItemModule } from './entities/invoice-item/admin-invoice-item.module'

@Module({
  imports: [AdminModule, AdminGoogleProfileDetailsModule, AdminConsumerModule, AuthModule, AdminInvoiceModule, AdminInvoiceItemModule],
})
export class AdminCommonModule {}
