import { Inject, Injectable } from '@nestjs/common'

import { IPaymentRequestModel, TableName } from '@wirebill/shared-common/models'
import { ListQuery } from '@wirebill/shared-common/types'

import { BaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { ListResponse } from '../../../dtos/common'
import { getKnexCount } from '../../../utils'
import { ConsumerService } from '../consumer/consumer.service'

import { PaymentRequestRepository } from './payment-request.repository'

@Injectable()
export class PaymentRequestService extends BaseService<IPaymentRequestModel, PaymentRequestRepository> {
  constructor(
    @Inject(PaymentRequestRepository) repository: PaymentRequestRepository,
    @Inject(ConsumerService) private readonly consumersService: ConsumerService,
  ) {
    super(repository)
  }

  async listPaymentRequests(
    consumerId: string,
    query: ListQuery<IPaymentRequestModel>,
  ): Promise<ListResponse<CONSUMER.PaymentRequestResponse>> {
    const baseQuery = this.repository.knex
      .from(`${TableName.PaymentRequest} as p`)
      .join(`${TableName.Consumer} as requester`, `requester.id`, `p.requester_id`)
      .join(`${TableName.Consumer} as payer`, `requester.id`, `p.payer_id`)
      .modify(qb => {
        if (query.filter) qb.where({ ...query.filter, requesterId: consumerId })
        if (query.sorting) query.sorting.forEach(({ field, direction }) => qb.orderBy(field, direction))
      })

    const count = await baseQuery.clone().count().then(getKnexCount)
    const data = await baseQuery.clone().modify(qb => {
      if (query.paging.limit) qb.limit(query.paging.limit)
      if (query.paging.offset) qb.offset(query.paging.offset)
    })

    return { count, data }
  }
}
