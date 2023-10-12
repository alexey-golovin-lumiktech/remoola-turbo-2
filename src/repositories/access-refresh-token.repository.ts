import { Injectable } from '@nestjs/common'
import { InjectKnex, Knex } from 'nestjs-knex'

import { IAccessRefreshTokenModel, TableName } from '@wirebill/shared-common/models'

import { BaseRepository } from '../common'

@Injectable()
export class AccessRefreshTokenRepository extends BaseRepository<Prettified<IAccessRefreshTokenModel>> {
  constructor(@InjectKnex() knex: Knex) {
    super(knex, TableName.AccessRefreshToken)
  }

  async upsert(dto: { accessToken: string; refreshToken: string; identityId: string }) {
    const exist = await this.findOne({ identityId: dto.identityId })
    const result = exist == null ? this.create(dto) : this.updateById(exist.id, dto)
    if (result == null) {
      const message = `Something went wrong for saving access and refresh tokens`
      throw message
    }
    return result
  }
}
