import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'
import { BaseRepository } from 'src/common/base.repository'

import { IResourceModel, TableName } from '@wirebill/shared-common/models'

@Injectable()
export class ResourceRepository extends BaseRepository<IResourceModel> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.Resource)
  }
}
