import { Inject, Injectable } from '@nestjs/common'
import moment from 'moment'

import { IPaymentRequestCreate } from '@wirebill/shared-common/dtos'
import { TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { IConsumerModel, IPaymentRequestModel, TableName } from '@wirebill/shared-common/models'
import { ReqQuery, TimelineFilter } from '@wirebill/shared-common/types'

import { BaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { getKnexCount, plainToInstance } from '../../../utils'
import { ConsumerResourceService } from '../consumer-resource/consumer-resource.service'
import { PaymentRequestAttachmentService } from '../payment-request-attachment/payment-request-attachment.service'

import { PaymentRequestRepository } from './payment-request.repository'

@Injectable()
export class PaymentRequestService extends BaseService<IPaymentRequestModel, PaymentRequestRepository> {
  constructor(
    @Inject(PaymentRequestRepository) repository: PaymentRequestRepository,
    @Inject(ConsumerResourceService) private readonly consumerResourceService: ConsumerResourceService,
    @Inject(PaymentRequestAttachmentService) private readonly paymentRequestAttachmentService: PaymentRequestAttachmentService,
  ) {
    super(repository)
  }

  async getConsumerPaymentRequestsList(
    consumerId: string,
    query: ReqQuery<IPaymentRequestModel>,
    timelineFilter: Unassignable<TimelineFilter<IPaymentRequestModel>>,
  ): Promise<CONSUMER.PaymentRequestListResponse> {
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

  async payToContact(dto: {
    identity: IConsumerModel
    files: Array<Express.Multer.File>
    body: CONSUMER.PaymentRequestPayToContact
  }): Promise<CONSUMER.PaymentRequestResponse> {
    const { identity, files, body } = dto

    // @TODO-IMPORTANT: do not forget add stripe logic
    /* 
    1 создать consumer
    2 добавить логику 
      - создание stripe.customer - если TransactionType.CreditCard
      - отправку письма для контакта которому производиться платёж 
        с приглашением в wirebill если контакт еше не является wirebill.consumer
    */
    const stripeLogicStub = { transactionId: `stripe-transaction-id` }
    const now = new Date()

    const paymentRequestData: IPaymentRequestCreate = {
      payerId: identity.id,
      transactionStatus: TransactionStatus.Completed,
      transactionId: body.transactionType == TransactionType.BankTransfer ? null : stripeLogicStub.transactionId,
      dueBy: now,
      sentDate: now,
      paidOn: now,
      ...body,
    }

    const created = await this.repository.create(paymentRequestData)
    await this.paymentRequestAttachmentService.createPaymentRequestAttachmentList(created.requesterId, created.id, files)
    const transformed = plainToInstance(CONSUMER.PaymentRequestResponse, created)
    console.log(`[transformed]`, transformed)
    return transformed
  }
}
