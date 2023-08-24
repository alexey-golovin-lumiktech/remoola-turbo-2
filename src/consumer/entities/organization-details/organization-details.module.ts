import { Module } from '@nestjs/common'

import { OrganizationDetailsRepository } from './organization-details.repository'
import { OrganizationDetailsService } from './organization-details.service'

@Module({
  providers: [OrganizationDetailsRepository, OrganizationDetailsService],
  exports: [OrganizationDetailsRepository, OrganizationDetailsService],
})
export class OrganizationDetailsModule {}
