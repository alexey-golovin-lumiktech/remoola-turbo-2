import { Module } from '@nestjs/common'

import { AuthModule } from './auth/auth.module'
import { AdminModule } from './entities/admin/admin.module'
import { AdminConsumerModule } from './entities/consumer/admin-consumer.module'
import { AdminGoogleProfileDetailsModule } from './entities/google-profile-details/admin-google-profile-details.module'

@Module({
  imports: [AdminModule, AdminGoogleProfileDetailsModule, AdminConsumerModule, AuthModule],
})
export class AdminCommonModule {}
