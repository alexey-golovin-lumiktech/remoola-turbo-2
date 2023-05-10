import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { BaseRepository } from '../../../common/base.repository'
import { IAddressModel, TableName } from '../../../models'

@Injectable()
export class AddressesRepository extends BaseRepository<IAddressModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Addresses)
  }
}
