import { Module } from '@nestjs/common'

import { PersonalDetailsRepository } from '../../../repositories'

import { AdminPersonalDetailsController } from './admin-personal-details.controller'
import { AdminPersonalDetailsService } from './admin-personal-details.service'

@Module({
  controllers: [AdminPersonalDetailsController],
  providers: [PersonalDetailsRepository, AdminPersonalDetailsService],
  exports: [PersonalDetailsRepository, AdminPersonalDetailsService],
})
export class AdminPersonalDetailsModule {}
