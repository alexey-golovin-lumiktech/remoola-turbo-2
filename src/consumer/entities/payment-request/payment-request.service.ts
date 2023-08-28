import { Inject, Injectable } from '@nestjs/common'
import { Knex } from 'knex'
import { snakeCase } from 'lodash'
import moment from 'moment'

import { IPaymentRequestCreate } from '@wirebill/shared-common/dtos'
import { TransactionStatus, TransactionType } from '@wirebill/shared-common/enums'
import { IConsumerModel, IPaymentRequestModel, TableName } from '@wirebill/shared-common/models'
import { ReqQuery, TimelineFilter } from '@wirebill/shared-common/types'

import { BaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { getKnexCount, plainToInstance } from '../../../utils'
import { ConsumerService } from '../consumer/consumer.service'
import { PaymentRequestAttachmentService } from '../payment-request-attachment/payment-request-attachment.service'

import { PaymentRequestRepository } from './payment-request.repository'

@Injectable()
export class PaymentRequestService extends BaseService<IPaymentRequestModel, PaymentRequestRepository> {
  constructor(
    @Inject(PaymentRequestRepository) repository: PaymentRequestRepository,
    @Inject(PaymentRequestAttachmentService) private readonly paymentRequestAttachmentService: PaymentRequestAttachmentService,
    @Inject(ConsumerService) private readonly consumerService: ConsumerService,
  ) {
    super(repository)
  }

  async getConsumerPaymentRequestsList(
    consumerId: string,
    query: ReqQuery<IPaymentRequestModel>,
    timelineFilter: Unassignable<TimelineFilter<IPaymentRequestModel>>,
  ): Promise<CONSUMER.PaymentRequestListResponse> {
    const filters = <T>(qb: Knex.QueryBuilder<T>) => {
      if (query.filter) qb.where(query.filter)
      if (timelineFilter) {
        qb.where(
          `p.${snakeCase(timelineFilter.field)}`,
          timelineFilter.comparison,
          moment.utc(timelineFilter.value).startOf(`day`).format(`YYYY-MM-DD`),
        )
      }
    }

    const baseQuery = this.repository.knex
      .from(`${TableName.PaymentRequest} as p`)
      .join(`${TableName.Consumer} as requester`, `requester.id`, `p.requester_id`)
      .join(`${TableName.Consumer} as payer`, `payer.id`, `p.payer_id`)
      .where({ requesterId: consumerId })
      .modify(filters)
      .orWhere({ payerId: consumerId })
      .modify(filters)

    const count: Awaited<number> = await baseQuery.clone().count().then(getKnexCount)

    const data: Awaited<CONSUMER.PaymentRequestResponse[]> = await baseQuery
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

    for (const item of data) {
      item.attachments = await this.paymentRequestAttachmentService.getAttachmentList(consumerId, item.id)
    }

    const result = { count, data }
    return result
  }

  async getConsumerPaymentRequestById(consumerId: string, paymentRequestId: string): Promise<CONSUMER.PaymentRequestResponse> {
    const data: Awaited<CONSUMER.PaymentRequestResponse> = await this.repository.knex
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

    if (data != null) data.attachments = await this.paymentRequestAttachmentService.getAttachmentList(consumerId, data.id)

    return data
  }

  async payToContact(dto: {
    identity: IConsumerModel
    files: Array<Express.Multer.File>
    body: CONSUMER.PaymentRequestPayToContact
  }): Promise<CONSUMER.PaymentRequestResponse> {
    try {
      const { identity, files } = dto
      const { contactEmail, ...restBody } = dto.body

      const consumer = await this.consumerService.repository.findOne({ email: contactEmail })
      console.log(`[consumer]`, consumer)

      /* check payments on ui pay!!!!!
        @IMPORTANT_NOTE: do not forget add stripe logic
        1 создать consumer
        2 добавить логику 
          - создание stripe.customer - если TransactionType.CreditCard
          - отправку письма для контакта которому производиться платёж 
            с приглашением в wirebill если контакт еше не является wirebill.consumer
      */
      const stripeLogicStub = { transactionId: `stripe-transaction-id` }
      const now = new Date()

      const paymentRequestData: IPaymentRequestCreate = {
        requesterId: consumer.id,
        payerId: identity.id,
        transactionStatus: TransactionStatus.Completed,
        transactionId: restBody.transactionType == TransactionType.BankTransfer ? null : stripeLogicStub.transactionId,
        dueBy: now,
        sentDate: now,
        paidOn: now,
        ...restBody,
      }

      const created = await this.repository.create(paymentRequestData)
      if (files.length != 0) await this.paymentRequestAttachmentService.createMany(created.requesterId, created.id, files)
      const transformed = plainToInstance(CONSUMER.PaymentRequestResponse, created)
      console.log(`[transformed]`, transformed)
      return transformed
    } catch (error) {
      console.log(`[error]`, error)
    }
  }
}
