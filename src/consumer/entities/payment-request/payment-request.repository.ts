import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common'
import { IPaymentRequestModel, TableName } from '../../../models'

@Injectable()
export class PaymentRequestRepository extends BaseRepository<IPaymentRequestModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.PaymentRequest)
  }
}
