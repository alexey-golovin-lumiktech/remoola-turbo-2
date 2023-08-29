import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IResourceModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../../common/base.repository'

@Injectable()
export class ResourceRepository extends BaseRepository<IResourceModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Resource)
  }
}
