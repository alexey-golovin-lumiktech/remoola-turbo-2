import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IPaymentRequestAttachmentModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../../../common'

@Injectable()
export class PaymentRequestAttachmentRepository extends BaseRepository<IPaymentRequestAttachmentModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.PaymentRequestAttachment)
  }
}
