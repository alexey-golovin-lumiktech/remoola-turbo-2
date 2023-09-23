import { BadRequestException, Inject, Injectable } from '@nestjs/common'

import { IGoogleProfileDetailsModel } from '@wirebill/shared-common/models'

import { BaseService, IBaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { GoogleProfileDetailsRepository } from '../../../repositories'
import { ConsumerService } from '../consumer/consumer.service'

@Injectable()
export class GoogleProfileDetailsService
  extends BaseService<IGoogleProfileDetailsModel, GoogleProfileDetailsRepository>
  implements IBaseService<IGoogleProfileDetailsModel, GoogleProfileDetailsRepository>
{
  constructor(
    @Inject(GoogleProfileDetailsRepository) repository: GoogleProfileDetailsRepository,
    @Inject(ConsumerService) private readonly consumerService: ConsumerService,
  ) {
    super(repository)
  }

  async upsert(consumerId: string, dto: CONSUMER.GoogleProfileDetailsUpdate): Promise<IGoogleProfileDetailsModel> {
    const consumer = await this.consumerService.repository.findById(consumerId)
    if (consumer == null) throw new BadRequestException(`Consumer does not exist`)

    const data = { ...dto, metadata: JSON.stringify(dto) }
    const exist = await this.repository.findOne({ email: dto.email })
    const googleProfileDetails = exist != null ? await this.repository.updateById(exist.id, data) : await this.repository.create(data)
    if (googleProfileDetails == null) throw new BadRequestException(`Something went wrong for creating google profile details`)

    await this.consumerService.repository.updateById(consumer.id, { googleProfileDetailsId: googleProfileDetails.id })
    return googleProfileDetails
  }
}
