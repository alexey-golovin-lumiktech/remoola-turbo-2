import { Inject, Injectable } from '@nestjs/common'

import { IConsumerModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { commonUtils } from '../../../common-utils'
import { ADMIN } from '../../../dtos'
import { ConsumerRepository } from '../../../repositories'

@Injectable()
export class AdminConsumerService extends BaseService<IConsumerModel, ConsumerRepository> {
  constructor(@Inject(ConsumerRepository) repository: ConsumerRepository) {
    super(repository)
  }

  findByEmail(email: string): Promise<IConsumerModel | null> {
    return this.repository.findOne({ email })
  }

  create(body: ADMIN.ConsumerCreate): Promise<IConsumerModel> {
    const salt = commonUtils.getHashingSalt(10)
    const hash = commonUtils.hashPassword({ password: body.password, salt })
    return this.repository.create({ ...body, password: hash, salt })
  }

  update(consumerId: string, body: ADMIN.ConsumerUpdate): Promise<IConsumerModel> {
    if (body.password != null) {
      body.salt = commonUtils.getHashingSalt(10)
      body.password = commonUtils.hashPassword({ password: body.password, salt: body.salt })
    }
    return this.repository.updateById(consumerId, body)
  }
}
