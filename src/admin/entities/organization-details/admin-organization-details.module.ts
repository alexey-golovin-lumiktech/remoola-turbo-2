import { Module } from '@nestjs/common'

import { OrganizationDetailsRepository } from '@-/repositories'

import { AdminOrganizationDetailsController } from './admin-organization-details.controller'
import { AdminOrganizationDetailsService } from './admin-organization-details.service'

@Module({
  controllers: [AdminOrganizationDetailsController],
  providers: [OrganizationDetailsRepository, AdminOrganizationDetailsService],
  exports: [OrganizationDetailsRepository, AdminOrganizationDetailsService],
})
export class AdminOrganizationDetailsModule {}
