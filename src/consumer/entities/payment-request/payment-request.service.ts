import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import moment from 'moment'

import { IConsumerModel, IPaymentRequestModel, TableName } from '@wirebill/shared-common/models'
import { ReqQuery, TimelineFilter } from '@wirebill/shared-common/types'

import { BaseService } from '../../../common'
import { CONSUMER } from '../../../dtos'
import { ListResponse } from '../../../dtos/common'
import { getKnexCount } from '../../../utils'
import { ConsumerService } from '../consumer/consumer.service'

import { PaymentRequestRepository } from './payment-request.repository'

@Injectable()
export class PaymentRequestService extends BaseService<IPaymentRequestModel, PaymentRequestRepository> {
  s3Client: S3Client
  bucket: string

  constructor(
    @Inject(PaymentRequestRepository) repository: PaymentRequestRepository,
    @Inject(ConsumerService) private readonly consumersService: ConsumerService,
    private readonly configService: ConfigService,
  ) {
    super(repository)
    this.s3Client = new S3Client()
    this.bucket = configService.get(`AWS_BUCKET_NAME`)
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

  async payToContact(dto: {
    identity: IConsumerModel
    files: Array<Express.Multer.File>
    body: CONSUMER.PaymentRequestPayToContact
  }): Promise<void> {
    await this.uploadToS3(dto.files)
  }

  private async uploadToS3(files: Array<Express.Multer.File>) {
    const responses = []
    const errors = []

    for (const file of files) {
      try {
        const command = new PutObjectCommand({
          Bucket: this.bucket,
          Key: this.sanitiseString(file.filename || file.originalname),
          Body: file.buffer,
          ContentType: file.mimetype,
        })
        const response = await this.s3Client.send(command)
        responses.push(response)
      } catch (error) {
        console.log(`[error]`, error)
        errors.push(error)
        continue
      }
    }

    return { errors, responses }
  }

  private sanitiseString(str: string): string {
    return Buffer.from(str, `latin1`).toString(`utf8`).replace(/_|-|,/gi, ` `).replace(/\s+/gi, `_`)
  }
}
