import { Module } from '@nestjs/common'
import { UsersModule } from './entities/users/users.module'
import { GoogleProfilesModule } from './entities/google-profiles/google-profiles.module'
import { AuthModule } from './auth/auth.module'

@Module({
  imports: [UsersModule, GoogleProfilesModule, AuthModule]
})
export class AdminModule {}
