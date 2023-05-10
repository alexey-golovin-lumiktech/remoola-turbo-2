import { Module } from '@nestjs/common'

import { AuthModule } from './auth/auth.module'
import { ConsumersModule } from './entities/consumers/consumers.module'
import { GoogleProfilesModule } from './entities/googleProfiles/googleProfiles.module'
import { PaymentsModule } from './payments/payments.module'

@Module({
  imports: [GoogleProfilesModule, ConsumersModule, AuthModule, PaymentsModule]
})
export class ConsumerModule {}
