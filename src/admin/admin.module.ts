import { Module } from '@nestjs/common'
import { AdminsModule } from './entities/admins/admins.module'
import { GoogleProfilesModule } from './entities/google-profiles/google-profiles.module'
import { AuthModule } from './auth/auth.module'
import { UsersModule } from './entities/users/users.module'

@Module({
  imports: [AdminsModule, GoogleProfilesModule, UsersModule, AuthModule]
})
export class AdminModule {}
