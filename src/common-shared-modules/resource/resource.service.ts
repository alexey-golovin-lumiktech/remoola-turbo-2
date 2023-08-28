import { Inject, Injectable, Logger } from '@nestjs/common'
import { BaseService } from 'src/common'

import { IResourceCreate } from '@wirebill/shared-common/dtos'
import { IResourceModel } from '@wirebill/shared-common/models'

import { AwsS3Service } from '../aws-s3/aws-s3.service'

import { ResourceRepository } from './resource.repository'

@Injectable()
export class ResourceService extends BaseService<IResourceModel, ResourceRepository> {
  private readonly logger = new Logger(ResourceService.name)
  constructor(
    @Inject(ResourceRepository) repository: ResourceRepository, //
    @Inject(AwsS3Service) private readonly s3Service: AwsS3Service,
  ) {
    super(repository)
  }

  async createOne(file: Express.Multer.File): Promise<IResourceModel | null> {
    const uploaded: IResourceCreate = await this.s3Service.uploadOne(file)
    if (uploaded != null) {
      const resource = await this.repository.create(uploaded)
      return resource ?? null
    }
    return null
  }

  async createMany(files: Express.Multer.File[]) {
    const resources: IResourceModel[] = []
    for (const file of files) {
      try {
        const resource = await this.createOne(file)
        if (resource != null) resources.push(resource)
      } catch (error) {
        const message = `[createManyResources] Something went wrong to process file: ${file.originalname}`
        this.logger.error(error?.message || message)
        continue
      }
    }
    return resources
  }
}
