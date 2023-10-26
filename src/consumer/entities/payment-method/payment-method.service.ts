import { Inject, Injectable } from '@nestjs/common'
import { snakeCase } from 'lodash'
import { BaseService } from 'src/common'
import { commonUtils } from 'src/common-utils'
import { CONSUMER } from 'src/dtos'
import { PaymentMethodRepository } from 'src/repositories'

import { IPaymentMethodModel, TableName } from '@wirebill/shared-common/models'
import { ReqQuery } from '@wirebill/shared-common/types'

@Injectable()
export class PaymentMethodService extends BaseService<IPaymentMethodModel, PaymentMethodRepository> {
  constructor(@Inject(PaymentMethodRepository) repository: PaymentMethodRepository) {
    super(repository)
  }

  async findAndCountAll(query: ReqQuery<IPaymentMethodModel> = {}): Promise<CONSUMER.PaymentMethodListResponse> {
    const baseQuery = this.repository.knex
      .from(TableName.PaymentMethod)
      .where(`deleted_at`, null)
      .modify(q => {
        if (query.filter) q.andWhere(query.filter)
        if (query.paging?.limit) q.limit(query.paging.limit)
        if (query.paging?.offset) q.offset(query.paging.offset)
      })

    const data = await baseQuery.clone().modify(q => {
      if (query.sorting != null) {
        for (const { field: attr, direction } of query.sorting) {
          if (!attr || !direction) continue
          q.orderBy(snakeCase(String(attr)), direction)
        }
      }
    })

    const count = await baseQuery.clone().count().then(commonUtils.dbQuerying.getKnexCount)
    return { data, count }
  }
}
