import { Module } from '@nestjs/common'
import { GoogleProfilesModule } from '../google-profiles/google-profiles.module'
import { UsersController } from './users.controller'
import { UsersRepository } from './users.repository'
import { UsersService } from './users.service'

@Module({
  imports: [GoogleProfilesModule],
  controllers: [UsersController],
  providers: [UsersService, UsersRepository],
  exports: [UsersService, UsersRepository]
})
export class UsersModule {}
