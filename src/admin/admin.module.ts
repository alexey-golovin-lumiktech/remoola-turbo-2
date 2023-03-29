import { Module } from '@nestjs/common'
import { UsersModule } from './entities/users/users.module'
import { GoogleProfilesModule } from './entities/google-profiles/google-profiles.module'

@Module({
  imports: [UsersModule, GoogleProfilesModule]
})
export class AdminModule {}
