import { Module } from '@nestjs/common'

import { AdminPersonalDetailsController } from './admin-personal-details.controller'
import { AdminPersonalDetailsRepository } from './admin-personal-details.repository'
import { AdminPersonalDetailsService } from './admin-personal-details.service'

@Module({
  controllers: [AdminPersonalDetailsController],
  providers: [AdminPersonalDetailsService, AdminPersonalDetailsRepository],
  exports: [AdminPersonalDetailsService, AdminPersonalDetailsRepository],
})
export class AdminPersonalDetailsModule {}
