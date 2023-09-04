import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IContactModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../common'

@Injectable()
export class ContactRepository extends BaseRepository<IContactModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Contact)
  }
}
