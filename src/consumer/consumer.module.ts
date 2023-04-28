import { Module } from '@nestjs/common'
import { GoogleProfilesModule } from './entities/googleProfiles/googleProfiles.module'
import { UsersModule } from './entities/users/users.module'
import { AuthModule } from './auth/auth.module'
import { PaymentsModule } from './payments/payments.module'

@Module({
  imports: [GoogleProfilesModule, UsersModule, AuthModule, PaymentsModule]
})
export class ConsumerModule {}
