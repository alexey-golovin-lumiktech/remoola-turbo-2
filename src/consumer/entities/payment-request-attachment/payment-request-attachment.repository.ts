import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'
import { BaseRepository } from 'src/common'

import { IPaymentRequestAttachmentModel, TableName } from '@wirebill/shared-common/models'

@Injectable()
export class PaymentRequestAttachmentRepository extends BaseRepository<IPaymentRequestAttachmentModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.PaymentRequestAttachment)
  }
}
