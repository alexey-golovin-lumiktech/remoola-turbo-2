import { Inject, Injectable } from '@nestjs/common'
import { Knex } from 'knex'
import { snakeCase } from 'lodash'
import moment from 'moment'

import { IPaymentRequestCreate } from '@wirebill/shared-common/dtos'
import { TransactionStatus } from '@wirebill/shared-common/enums'
import { IConsumerModel, IPaymentRequestModel, TableName } from '@wirebill/shared-common/models'
import { ReqQuery, ReqQueryTimelineFilter } from '@wirebill/shared-common/types'

import { BaseService } from '../../../common'
import { MailingService } from '../../../common-shared-modules/mailing/mailing.service'
import { commonUtils } from '../../../common-utils'
import { CONSUMER } from '../../../dtos'
import { PaymentRequestRepository } from '../../../repositories'
import { ConsumerService } from '../consumer/consumer.service'
import { PaymentRequestAttachmentService } from '../payment-request-attachment/payment-request-attachment.service'
import { TransactionService } from '../transaction/transaction.service'

@Injectable()
export class PaymentRequestService extends BaseService<IPaymentRequestModel, PaymentRequestRepository> {
  constructor(
    @Inject(PaymentRequestRepository) repository: PaymentRequestRepository,
    @Inject(PaymentRequestAttachmentService) private readonly paymentRequestAttachmentService: PaymentRequestAttachmentService,
    @Inject(TransactionService) private readonly transactionService: TransactionService,
    @Inject(ConsumerService) private readonly consumerService: ConsumerService,
    private readonly mailingService: MailingService,
  ) {
    super(repository)
  }

  async getSentPaymentRequestsList(
    consumerId: string,
    query: ReqQuery<IPaymentRequestModel>,
    timelineFilter: Unassignable<ReqQueryTimelineFilter<IPaymentRequestModel>>,
  ): Promise<CONSUMER.PaymentRequestListResponse> {
    const withFilters = <T>(qb: Knex.QueryBuilder<T>) => {
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
      .modify(withFilters)

    const count: Awaited<number> = await baseQuery.clone().count().then(commonUtils.dbQuerying.getKnexCount)

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

    for (const item of data) item.attachments = await this.paymentRequestAttachmentService.getAttachmentList(consumerId, item.id)
    return { count, data }
  }

  async getReceivedPaymentRequestsList(
    consumerId: string,
    query: ReqQuery<IPaymentRequestModel>,
    timelineFilter: Unassignable<ReqQueryTimelineFilter<IPaymentRequestModel>>,
  ): Promise<CONSUMER.PaymentRequestListResponse> {
    const withFilters = <T>(qb: Knex.QueryBuilder<T>) => {
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
      .orWhere({ payerId: consumerId })
      .modify(withFilters)

    const count: Awaited<number> = await baseQuery.clone().count().then(commonUtils.dbQuerying.getKnexCount)

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

    for (const item of data) item.attachments = await this.paymentRequestAttachmentService.getAttachmentList(consumerId, item.id)
    return { count, data }
  }

  async getPaymentRequestsHistory(
    consumerId: string,
    query: ReqQuery<IPaymentRequestModel>,
    timelineFilter: Unassignable<ReqQueryTimelineFilter<IPaymentRequestModel>>,
  ): Promise<CONSUMER.PaymentRequestListResponse> {
    const withFilters = <T>(qb: Knex.QueryBuilder<T>) => {
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
      .modify(withFilters)
      .orWhere({ payerId: consumerId })
      .modify(withFilters)

    const count: Awaited<number> = await baseQuery.clone().count().then(commonUtils.dbQuerying.getKnexCount)

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

    for (const item of data) item.attachments = await this.paymentRequestAttachmentService.getAttachmentList(consumerId, item.id)
    return { count, data }
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
    const { identity, files } = dto
    const { contactEmail, ...restBody } = dto.body
    const { amount, currencyCode, description, type } = restBody
    const payerName = identity.firstName
    const payerEmail = identity.email

    const consumer = await this.getExistingConsumerOrCreatedAndInvitedToSystem(contactEmail)
    this.mailingService.sendPayToContactPaymentInfoEmail({ contactEmail, payerEmail, paymentDetailsLink: `http://localhost:5173` })
    /* check payments on ui pay!!!!!
        @IMPORTANT_NOTE: do not forget add stripe logic
        1 создать consumer
        2 добавить логику 
          - создание stripe.customer - если TransactionType.CreditCard
          - отправку письма для контакта которому производиться платёж 
            с приглашением в wirebill если контакт еше не является wirebill.consumer
      */

    const now = new Date()

    const paymentRequest: Awaited<IPaymentRequestModel> = await this.repository.create({
      requesterId: consumer.id,
      payerId: identity.id,
      status: TransactionStatus.WaitingRecipientApproval,
      dueDate: now,
      sentDate: now,
      expectationDate: now,
      createdBy: identity.email,
      updatedBy: identity.email,
      deletedBy: null,
      amount: amount,
      currencyCode: currencyCode,
      description: description,
      type: type,
    } satisfies IPaymentRequestCreate)
    await this.transactionService.createFromPaymentRequest(paymentRequest)

    let attachments: CONSUMER.PaymentRequestResponse[`attachments`] = []

    if (files.length != 0) {
      await this.paymentRequestAttachmentService.createMany(paymentRequest.requesterId, paymentRequest.id, files)
      attachments = await this.paymentRequestAttachmentService.getAttachmentList(identity.id, paymentRequest.id)
    }

    const additions = { payerName, payerEmail, requesterName: consumer.firstName, requesterEmail: consumer.email, attachments }
    return { ...paymentRequest, ...additions }
  }

  private async getExistingConsumerOrCreatedAndInvitedToSystem(contactEmail: string): Promise<IConsumerModel> {
    const exist = await this.consumerService.repository.findOne({ email: contactEmail })
    if (exist != null) return exist

    const consumer = await this.consumerService.repository.create({ email: contactEmail })

    return consumer
  }
}
