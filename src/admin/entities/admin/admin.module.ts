import { Module } from '@nestjs/common'

import { AdminRepository } from '../../../repositories'

import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

@Module({
  controllers: [AdminController],
  providers: [AdminRepository, AdminService],
  exports: [AdminRepository, AdminService],
})
export class AdminModule {}
