import { Module } from '@nestjs/common'
import { GoogleProfilesModule } from './entities/google-profiles/google-profiles.module'
import { UsersModule } from './entities/users/users.module'

@Module({
  imports: [GoogleProfilesModule, UsersModule]
})
export class ConsumerModule {}
