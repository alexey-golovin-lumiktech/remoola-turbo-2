import { Inject, Injectable, Logger } from '@nestjs/common'
import { BaseService } from 'src/common'
import { ResourceService } from 'src/common-shared-modules/resource/resource.service'

import { IAdminResourceModel } from '@wirebill/shared-common/models'

import { AdminResourceRepository } from './admin-resource.repository'

@Injectable()
export class AdminResourceService extends BaseService<IAdminResourceModel, AdminResourceRepository> {
  private readonly logger = new Logger(AdminResourceService.name)

  constructor(
    @Inject(AdminResourceRepository) repository: AdminResourceRepository,
    @Inject(ResourceService) private readonly resourceService: ResourceService,
  ) {
    super(repository)
  }

  async createAdminResource(adminId: string, file: Express.Multer.File): Promise<IAdminResourceModel | null> {
    try {
      const resource = await this.resourceService.createOneResource(file)
      if (resource == null) return null
      const consumerResource = await this.repository.create({ adminId, resourceId: resource.id })
      return consumerResource ?? null
    } catch (error) {
      const message = `[createAdminResource] Resource not created from file: ${file.originalname}`
      this.logger.error(message)
      return null
    }
  }

  async createAdminResourceList(adminId: string, files: Express.Multer.File[]): Promise<IAdminResourceModel[]> {
    const collected: IAdminResourceModel[] = []

    for (const file of files) {
      try {
        const toCollect = await this.createAdminResource(adminId, file)
        if (toCollect == null) {
          const message = `[createAdminResourceList] ConsumerResource not created from file: ${file.originalname}`
          this.logger.error(message)
          continue
        } else collected.push(toCollect)
      } catch (error) {
        const message = `[createAdminResourceList] Something went wrong to process file: ${file.originalname}`
        this.logger.error(error?.message || message)
        continue
      }
    }

    return collected
  }
}
