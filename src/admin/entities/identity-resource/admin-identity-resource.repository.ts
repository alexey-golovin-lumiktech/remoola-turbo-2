import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IIdentityResourceModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../../../common'

@Injectable()
export class AdminIdentityResourceRepository extends BaseRepository<IIdentityResourceModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.IdentityResource)
  }
}
