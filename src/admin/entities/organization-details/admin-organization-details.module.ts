import { Module } from '@nestjs/common'

import { AdminOrganizationDetailsController } from './admin-organization-details.controller'
import { AdminOrganizationDetailsRepository } from './admin-organization-details.repository'
import { AdminOrganizationDetailsService } from './admin-organization-details.service'

@Module({
  controllers: [AdminOrganizationDetailsController],
  providers: [AdminOrganizationDetailsService, AdminOrganizationDetailsRepository],
  exports: [AdminOrganizationDetailsService, AdminOrganizationDetailsRepository],
})
export class AdminOrganizationDetailsModule {}
