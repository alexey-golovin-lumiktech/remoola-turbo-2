import { Inject, Injectable, Logger } from '@nestjs/common'

import { IConsumerResourceModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { ResourceService } from '../../../common-shared-modules/resource/resource.service'
import { ConsumerResourceRepository } from '../../../repositories'

@Injectable()
export class ConsumerResourceService extends BaseService<IConsumerResourceModel, ConsumerResourceRepository> {
  private readonly logger = new Logger(ConsumerResourceService.name)

  constructor(
    @Inject(ConsumerResourceRepository) repository: ConsumerResourceRepository,
    @Inject(ResourceService) private readonly resourceService: ResourceService,
  ) {
    super(repository)
  }

  async createOne(consumerId: string, file: Express.Multer.File): Promise<IConsumerResourceModel | null> {
    const resource = await this.resourceService.createOne(file)
    if (resource == null) return null
    const consumerResource = await this.repository.create({ consumerId, resourceId: resource.id })
    return consumerResource ?? null
  }

  async createMany(consumerId: string, files: Express.Multer.File[] = []): Promise<IConsumerResourceModel[]> {
    const collected: IConsumerResourceModel[] = []

    for (const file of files) {
      try {
        const toCollect = await this.createOne(consumerId, file)
        if (toCollect == null) {
          const message = `[createConsumerResourceList] ConsumerResource not created from file: ${file.originalname}`
          this.logger.error(message)
          continue
        } else collected.push(toCollect)
      } catch (error) {
        const message = `[createConsumerResourceList] Something went wrong to process file: ${file.originalname}`
        this.logger.error(error?.message || message)
        continue
      }
    }

    return collected
  }
}
