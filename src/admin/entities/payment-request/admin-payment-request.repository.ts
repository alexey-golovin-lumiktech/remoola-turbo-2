import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IPaymentRequestModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../../../common'

@Injectable()
export class AdminPaymentRequestRepository extends BaseRepository<IPaymentRequestModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.PaymentRequest)
  }
}
