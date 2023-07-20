import { Inject, Injectable } from '@nestjs/common'

import { IResetPasswordModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { ConsumerService } from '../consumer/consumer.service'

import { ResetPasswordRepository } from './reset-password.repository'

@Injectable()
export class ResetPasswordService extends BaseService<IResetPasswordModel, ResetPasswordRepository> {
  constructor(
    @Inject(ResetPasswordRepository) repository: ResetPasswordRepository,
    @Inject(ConsumerService) private readonly consumersService: ConsumerService,
  ) {
    super(repository)
  }

  async upsert(dto: Pick<IResetPasswordModel, `consumerId` | `token`>) {
    const exist = await this.repository.findOne({ consumerId: dto.consumerId })
    const expiredAt = new Date(Date.now() + 1000 * 60 * 10)
    const data = { ...dto, expiredAt }
    const record = exist == null ? await this.repository.create(data) : await this.repository.updateById(exist.id, data)
    return record
  }

  async getRecordIfNotExpired(filter: Pick<IResetPasswordModel, `consumerId` | `token`>): Promise<IResetPasswordModel | null> {
    return this.repository.findOne(filter, { field: `expiredAt`, comparison: `>`, value: `current_timestamp` })
  }

  async removeUsedRecord(filter: Pick<IResetPasswordModel, `consumerId` | `token`>) {
    const found = await this.repository.find({ filter })
    return this.repository.deleteManyById(found.map(x => x.id))
  }
}
