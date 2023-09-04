import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IAddressDetailsModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../common'

@Injectable()
export class AddressDetailsRepository extends BaseRepository<IAddressDetailsModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.AddressDetails)
  }
}
