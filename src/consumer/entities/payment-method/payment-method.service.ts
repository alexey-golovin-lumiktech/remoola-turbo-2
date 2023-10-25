import { Inject, Injectable } from '@nestjs/common'
import { BaseService } from 'src/common'
import { commonUtils } from 'src/common-utils'
import { CONSUMER } from 'src/dtos'
import { PaymentMethodRepository } from 'src/repositories'

import { IPaymentMethodModel, TableName } from '@wirebill/shared-common/models'

@Injectable()
export class PaymentMethodService extends BaseService<IPaymentMethodModel, PaymentMethodRepository> {
  constructor(@Inject(PaymentMethodRepository) repository: PaymentMethodRepository) {
    super(repository)
  }

  async findAndCountAll(consumerId: string): Promise<CONSUMER.PaymentMethodListResponse> {
    const baseQuery = this.repository.knex.from(TableName.PaymentMethod).where(`consumer_id`, consumerId).andWhere(`deleted_at`, null)
    const count = await baseQuery.clone().count().then(commonUtils.dbQuerying.getKnexCount)
    const data = await baseQuery.clone()
    return { data, count }
  }
}
