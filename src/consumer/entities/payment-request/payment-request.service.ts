import { Inject, Injectable } from '@nestjs/common'
import moment from 'moment'

import { IPaymentRequestModel, TableName } from '@wirebill/shared-common/models'
import { ReqQuery, TimelineFilter } from '@wirebill/shared-common/types'

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

  async getConsumerPaymentRequestsList(
    consumerId: string,
    query: ReqQuery<IPaymentRequestModel>,
    timelineFilter: Unassignable<TimelineFilter<IPaymentRequestModel>>,
  ): Promise<ListResponse<CONSUMER.PaymentRequestResponse>> {
    const baseQuery = this.repository.knex
      .from(`${TableName.PaymentRequest} as p`)
      .join(`${TableName.Consumer} as requester`, `requester.id`, `p.requester_id`)
      .join(`${TableName.Consumer} as payer`, `payer.id`, `p.payer_id`)
      .where({ requesterId: consumerId })
      .modify(qb => {
        if (query.filter) qb.andWhere(query.filter)
        if (timelineFilter) {
          qb.andWhere(`p.${timelineFilter.field}`, timelineFilter.comparison, moment(timelineFilter.value).format(`YYYY-MM-DD`))
        }
      })

    const count = await baseQuery.clone().count().then(getKnexCount)

    const data = await baseQuery
      .clone()
      .modify(qb => {
        if (query?.paging?.limit) qb.limit(query.paging.limit)
        if (query?.paging?.offset) qb.offset(query.paging.offset)
        if (query?.sorting) query.sorting.forEach(({ field, direction }) => qb.orderBy(field, direction))
      })
      .select(
        `p.*`,
        `requester.first_name as requester_name`,
        `payer.first_name as payer_name`,
        `requester.email as requester_email`,
        `payer.email as payer_email`,
      )

    const result = { count, data }
    return result
  }

  async getConsumerPaymentRequestById(paymentRequestId: string): Promise<CONSUMER.PaymentRequestResponse> {
    return this.repository.knex
      .from(`${TableName.PaymentRequest} as p`)
      .join(`${TableName.Consumer} as requester`, `requester.id`, `p.requester_id`)
      .join(`${TableName.Consumer} as payer`, `payer.id`, `p.payer_id`)
      .where(`p.id`, paymentRequestId)
      .select(
        `p.*`,
        `requester.first_name as requester_name`,
        `payer.first_name as payer_name`,
        `requester.email as requester_email`,
        `payer.email as payer_email`,
      )
      .first()
  }
}
