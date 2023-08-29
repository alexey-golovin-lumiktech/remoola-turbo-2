import { Module } from '@nestjs/common'

import { ResourceModule } from '../../../common-shared-modules/resource/resource.module'

import { AdminResourceController } from './admin-resource.controller'
import { AdminResourceRepository } from './admin-resource.repository'
import { AdminResourceService } from './admin-resource.service'

@Module({
  imports: [ResourceModule],
  controllers: [AdminResourceController],
  providers: [AdminResourceService, AdminResourceRepository],
  exports: [AdminResourceService, AdminResourceRepository],
})
export class AdminResourceModule {}
