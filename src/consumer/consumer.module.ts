import { Module } from '@nestjs/common'
import { GoogleProfilesModule } from './entities/googleProfiles/googleProfiles.module'
import { UsersModule } from './entities/users/users.module'
import { AuthModule } from './auth/auth.module'

@Module({
  imports: [GoogleProfilesModule, UsersModule, AuthModule]
})
export class ConsumerModule {}
