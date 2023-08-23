import { Module } from '@nestjs/common'

import { AdminIdentityResourceController } from './admin-identity-resource.controller'
import { AdminIdentityResourceRepository } from './admin-identity-resource.repository'
import { AdminIdentityResourceService } from './admin-identity-resource.service'

@Module({
  controllers: [AdminIdentityResourceController],
  providers: [AdminIdentityResourceService, AdminIdentityResourceRepository],
  exports: [AdminIdentityResourceService, AdminIdentityResourceRepository],
})
export class AdminIdentityResourceModule {}
