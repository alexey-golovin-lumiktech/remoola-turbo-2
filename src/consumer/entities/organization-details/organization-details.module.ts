import { forwardRef, Module } from '@nestjs/common'

import { ConsumerModule } from '../consumer/consumer.module'

import { OrganizationDetailsRepository } from './organization-details.repository'
import { OrganizationDetailsService } from './organization-details.service'

@Module({
  imports: [forwardRef(() => ConsumerModule)],
  providers: [OrganizationDetailsRepository, OrganizationDetailsService],
  exports: [OrganizationDetailsRepository, OrganizationDetailsService],
})
export class OrganizationDetailsModule {}
