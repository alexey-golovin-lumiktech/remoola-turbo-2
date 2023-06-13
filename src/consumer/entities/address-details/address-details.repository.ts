import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common'
import { IAddressDetailsModel, TABLE_NAME } from '../../../models'

@Injectable()
export class AddressDetailsRepository extends BaseRepository<IAddressDetailsModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TABLE_NAME.AddressDetails)
  }
}
