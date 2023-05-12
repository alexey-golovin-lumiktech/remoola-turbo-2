import { Module } from '@nestjs/common'

import { AdminsController } from './admins.controller'
import { AdminsRepository } from './admins.repository'
import { AdminsService } from './admins.service'

@Module({
  imports: [],
  controllers: [AdminsController],
  providers: [AdminsService, AdminsRepository],
  exports: [AdminsService, AdminsRepository],
})
export class AdminsModule {}
