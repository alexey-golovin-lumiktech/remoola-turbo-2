import { forwardRef, Module } from '@nestjs/common'

import { ConsumerModule } from '../consumer/consumer.module'

import { IdentityResourceRepository } from './identity-resource.repository'
import { IdentityResourceService } from './identity-resource.service'

@Module({
  imports: [forwardRef(() => ConsumerModule)],
  providers: [IdentityResourceRepository, IdentityResourceService],
  exports: [IdentityResourceRepository, IdentityResourceService],
})
export class IdentityResourceModule {}
