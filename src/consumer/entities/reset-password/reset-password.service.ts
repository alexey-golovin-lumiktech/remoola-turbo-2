import { Inject, Injectable } from '@nestjs/common'

import { IResetPasswordModel } from '@wirebill/shared-common/models'

import { BaseService } from '../../../common'
import { ResetPasswordRepository } from '../../../repositories'

@Injectable()
export class ResetPasswordService extends BaseService<IResetPasswordModel, ResetPasswordRepository> {
  constructor(@Inject(ResetPasswordRepository) repository: ResetPasswordRepository) {
    super(repository)
  }

  async upsert(dto: Pick<IResetPasswordModel, `consumerId` | `token`>) {
    const exist = await this.repository.findOne({ consumerId: dto.consumerId })
    const expiredAt = new Date(Date.now() + 1000 * 60 * 60 * 24)
    const record =
      exist == null
        ? await this.repository.create({ ...dto, expiredAt })
        : await this.repository.updateById(exist.id, { ...dto, expiredAt })

    return record
  }

  async getRecordIfNotExpired(filter: Pick<IResetPasswordModel, `consumerId` | `token`>) {
    return this.repository.findOne(filter, { field: `expiredAt`, comparison: `>`, value: `current_timestamp` })
  }

  async removeAllConsumerRecords(consumerId: IResetPasswordModel[`consumerId`]) {
    const found = await this.repository.find({ filter: { consumerId } })
    return this.repository.deleteManyById(found.map(x => x.id))
  }
}
