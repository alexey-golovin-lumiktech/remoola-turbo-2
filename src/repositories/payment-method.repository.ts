import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IPaymentMethodModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '@-/common'

@Injectable()
export class PaymentMethodRepository extends BaseRepository<IPaymentMethodModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.PaymentMethod)
  }
}
